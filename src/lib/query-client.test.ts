import { MutationObserver, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkIn, undoCheckIn } from './api';
import { CHECK_IN_MUTATION, keys, queryClient, type CheckInInput } from './query-client';

// vitest lifts these above the imports.

vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-network', () => ({ addNetworkStateListener: () => ({ remove() {} }) }));
vi.mock('./api', () => ({ checkIn: vi.fn(), undoCheckIn: vi.fn() }));

const input = (checkedIn: boolean): CheckInInput => ({
  fastId: 'f1',
  memberId: 'm1',
  dayNumber: 4,
  checkedIn,
});

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tap = (checkedIn: boolean) =>
  new MutationObserver<unknown, Error, CheckInInput>(queryClient, {
    mutationKey: CHECK_IN_MUTATION,
    retry: false,
  })
    .mutate(input(checkedIn))
    .catch(() => undefined);

const shown = () => queryClient.getQueryData<number[]>(keys.checkedDays('m1'));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('check-in taps in quick succession', () => {
  let server: number[];
  let fetches: number;
  let unsubscribe: () => void;

  beforeEach(async () => {
    queryClient.clear();
    vi.mocked(checkIn).mockReset();
    vi.mocked(undoCheckIn).mockReset();
    server = [];
    fetches = 0;
    // A mounted screen, so invalidating the query refetches it.
    unsubscribe = new QueryObserver(queryClient, {
      queryKey: keys.checkedDays('m1'),
      queryFn: async () => {
        fetches += 1;
        return [...server];
      },
    }).subscribe(() => undefined);
    await tick();
    fetches = 0;
  });

  afterEach(() => unsubscribe());

  it('sends them in order and never shows the state in between', async () => {
    const first = deferred();
    const second = deferred();
    const order: string[] = [];
    vi.mocked(checkIn).mockImplementation(async () => {
      order.push('check-in');
      await first.promise;
      server = [4];
    });
    vi.mocked(undoCheckIn).mockImplementation(async () => {
      order.push('undo');
      await second.promise;
      server = [];
    });

    const a = tap(true);
    await tick();
    const b = tap(false);
    await tick();

    expect(order).toEqual(['check-in']); // the undo waits its turn
    expect(shown()).toEqual([]); // but the screen already shows it

    first.resolve();
    await a;
    await tick();
    expect(fetches).toBe(0); // no refetch while the undo is queued
    expect(shown()).toEqual([]);

    second.resolve();
    await b;
    await tick();
    expect(order).toEqual(['check-in', 'undo']);
    expect(fetches).toBe(1);
    expect(shown()).toEqual([]);
  });

  it('keeps a newer tap on screen when an older request fails', async () => {
    const first = deferred();
    vi.mocked(checkIn).mockImplementationOnce(() => first.promise);
    vi.mocked(undoCheckIn).mockResolvedValue(undefined);
    vi.mocked(checkIn).mockImplementation(async () => {
      server = [4];
    });

    const a = tap(true);
    await tick();
    const b = tap(false);
    const c = tap(true);
    await tick();
    expect(shown()).toEqual([4]);

    first.reject(new Error('offline'));
    await a;
    expect(shown()).toEqual([4]); // the failed request's snapshot is not restored

    await Promise.all([b, c]);
    await tick();
    expect(shown()).toEqual([4]);
  });

  it('puts the screen back when a lone request fails', async () => {
    vi.mocked(checkIn).mockRejectedValue(new Error('refused'));
    await tap(true);
    await tick();
    expect(shown()).toEqual([]);
  });
});
