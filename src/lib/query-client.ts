/**
 * The app's one query client, set up so that today's content and check-in
 * work without signal:
 *
 * - Everything fetched is kept on the device, so a screen opened offline shows
 *   what it showed last time.
 * - A check-in made offline updates the screen at once, is saved on the
 *   device, and is sent when the connection returns, even if the app was
 *   closed in between.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  defaultShouldDehydrateMutation,
  onlineManager,
  QueryClient,
  type Mutation,
} from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';

import { checkIn, undoCheckIn } from './api';

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const CACHE_MAX_AGE = WEEK;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, gcTime: WEEK },
    mutations: { gcTime: WEEK },
  },
});

const storage = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'consecrate-cache-v1',
});

/**
 * A check-in stays saved on the phone until the server has answered, not only
 * while it waits for a connection. Otherwise one that was being sent when the
 * app was closed would be lost.
 */
export function shouldPersistMutation(mutation: Mutation): boolean {
  return defaultShouldDehydrateMutation(mutation) || mutation.state.status === 'pending';
}

/**
 * Whatever was unfinished when it was saved is stored as waiting, so that the
 * next launch sends it again. Sending a check-in twice is harmless: the
 * server ignores a repeat.
 */
export function asWaiting(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      mutations: client.clientState.mutations.map((m) =>
        m.state.status === 'pending' ? { ...m, state: { ...m.state, isPaused: true } } : m,
      ),
    },
  };
}

export const persister: Persister = {
  ...storage,
  persistClient: (client) => storage.persistClient(asWaiting(client)),
};

// Tell the query client when the phone is offline, so it pauses requests
// instead of failing them.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
  return () => subscription.remove();
});

export const keys = {
  myFasts: ['my-fasts'] as const,
  myFast: (fastId: string) => ['my-fasts', fastId] as const,
  preview: (code: string) => ['fast-preview', code] as const,
  day: (fastId: string, dayNumber: number) => ['fast-day', fastId, dayNumber] as const,
  memberCount: (fastId: string) => ['member-count', fastId] as const,
  days: (fastId: string) => ['fast-days', fastId] as const,
  checkedDays: (memberId: string) => ['checked-days', memberId] as const,
  group: (fastId: string, dayNumber: number) => ['group', fastId, dayNumber] as const,
  checkInCounts: (fastId: string) => ['check-in-counts', fastId] as const,
};

export const CHECK_IN_MUTATION = ['check-in'] as const;

export type CheckInInput = {
  fastId: string;
  memberId: string;
  dayNumber: number;
  checkedIn: boolean;
};

/**
 * True while another check-in for the same member is being sent or is queued.
 * Scoped to the member because that is whose list on screen is at stake; a
 * person in two fasts has a separate member, and a separate list, in each.
 */
function otherCheckInsPending(memberId: string): boolean {
  // The one finishing still counts as pending inside its own callbacks.
  return (
    queryClient.isMutating({
      mutationKey: CHECK_IN_MUTATION,
      predicate: (mutation) =>
        (mutation.state.variables as CheckInInput | undefined)?.memberId === memberId,
    }) > 1
  );
}

// Defined here, on the client, rather than in a component: a check-in saved
// while offline may be sent after a restart, when no screen is mounted to
// supply the function.
queryClient.setMutationDefaults(CHECK_IN_MUTATION, {
  mutationFn: (input: CheckInInput) =>
    input.checkedIn
      ? checkIn(input.memberId, input.dayNumber)
      : undoCheckIn(input.memberId, input.dayNumber),
  retry: 2,
  // One at a time, in the order they were tapped: a quick check-in then undo
  // must reach the server in that order, or the last tap could lose.
  scope: { id: 'check-in' },
  onMutate: async (input: CheckInInput) => {
    const key = keys.checkedDays(input.memberId);
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<number[]>(key);
    queryClient.setQueryData<number[]>(key, (days = []) =>
      input.checkedIn
        ? [...new Set([...days, input.dayNumber])].sort((a, b) => a - b)
        : days.filter((d) => d !== input.dayNumber),
    );
    return { previous };
  },
  onError: (_error, input: CheckInInput, context) => {
    // A later tap is still waiting to be sent: what the screen shows already
    // reflects it, so an older snapshot must not be put back over it.
    if (otherCheckInsPending(input.memberId)) return;
    const previous = (context as { previous?: number[] } | undefined)?.previous;
    queryClient.setQueryData(keys.checkedDays(input.memberId), previous);
  },
  onSettled: (_data, _error, input: CheckInInput) => {
    // Likewise, do not refetch between queued taps: the server would answer
    // with a state the next request is about to change, and the button would
    // flick back. The last one to settle refetches.
    if (otherCheckInsPending(input.memberId)) return;
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.checkedDays(input.memberId) }),
      queryClient.invalidateQueries({ queryKey: keys.group(input.fastId, input.dayNumber) }),
      queryClient.invalidateQueries({ queryKey: keys.checkInCounts(input.fastId) }),
    ]);
  },
});
