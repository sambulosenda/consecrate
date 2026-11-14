import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  checkIn,
  countMembers,
  createFast,
  getFastDay,
  getMyFast,
  joinFast,
  listCheckedDays,
  listFastDays,
  listGroup,
  listMyFasts,
  previewFast,
  undoCheckIn,
  updateFastDay,
  type FastDayContent,
} from './api';
import { isValidJoinCode } from './join-code';

export const keys = {
  myFasts: ['my-fasts'] as const,
  myFast: (fastId: string) => ['my-fasts', fastId] as const,
  preview: (code: string) => ['fast-preview', code] as const,
  day: (fastId: string, dayNumber: number) => ['fast-day', fastId, dayNumber] as const,
  memberCount: (fastId: string) => ['member-count', fastId] as const,
  days: (fastId: string) => ['fast-days', fastId] as const,
  checkedDays: (memberId: string) => ['checked-days', memberId] as const,
  group: (fastId: string, dayNumber: number) => ['group', fastId, dayNumber] as const,
};

export function useMyFasts() {
  return useQuery({ queryKey: keys.myFasts, queryFn: listMyFasts });
}

export function useMyFast(fastId: string) {
  return useQuery({ queryKey: keys.myFast(fastId), queryFn: () => getMyFast(fastId) });
}

export function useFastPreview(code: string) {
  return useQuery({
    queryKey: keys.preview(code),
    queryFn: () => previewFast(code),
    enabled: isValidJoinCode(code),
  });
}

export function useFastDay(fastId: string, dayNumber: number | null) {
  return useQuery({
    queryKey: keys.day(fastId, dayNumber ?? 0),
    queryFn: () => getFastDay(fastId, dayNumber as number),
    enabled: dayNumber !== null,
  });
}

export function useMemberCount(fastId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.memberCount(fastId),
    queryFn: () => countMembers(fastId),
    enabled,
  });
}

export function useJoinFast() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: joinFast,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.myFasts }),
  });
}

export function useCreateFast() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createFast,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.myFasts }),
  });
}

export function useFastDays(fastId: string) {
  return useQuery({ queryKey: keys.days(fastId), queryFn: () => listFastDays(fastId) });
}

export function useUpdateFastDay(fastId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { dayNumber: number; content: FastDayContent }) =>
      updateFastDay(fastId, input.dayNumber, input.content),
    onSuccess: (day) => {
      client.setQueryData(keys.day(fastId, day.day_number), day);
      return client.invalidateQueries({ queryKey: keys.days(fastId) });
    },
  });
}

export function useCheckedDays(memberId: string | null) {
  return useQuery({
    queryKey: keys.checkedDays(memberId ?? ''),
    queryFn: () => listCheckedDays(memberId as string),
    enabled: memberId !== null,
  });
}

/**
 * Check in (or undo) for a day. The button responds at once: the cached list
 * of checked days is updated before the server answers and rolled back if the
 * request fails.
 */
export function useSetCheckedIn(fastId: string, memberId: string) {
  const client = useQueryClient();
  const key = keys.checkedDays(memberId);
  return useMutation({
    mutationFn: (input: { dayNumber: number; checkedIn: boolean }) =>
      input.checkedIn ? checkIn(memberId, input.dayNumber) : undoCheckIn(memberId, input.dayNumber),
    onMutate: async ({ dayNumber, checkedIn }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<number[]>(key);
      client.setQueryData<number[]>(key, (days = []) =>
        checkedIn
          ? [...new Set([...days, dayNumber])].sort((a, b) => a - b)
          : days.filter((d) => d !== dayNumber),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context) client.setQueryData(key, context.previous);
    },
    onSettled: (_data, _error, { dayNumber }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: keys.group(fastId, dayNumber) }),
      ]),
  });
}

export function useGroup(fastId: string, dayNumber: number | null) {
  return useQuery({
    queryKey: keys.group(fastId, dayNumber ?? 0),
    queryFn: () => listGroup(fastId, dayNumber as number),
    enabled: dayNumber !== null,
  });
}
