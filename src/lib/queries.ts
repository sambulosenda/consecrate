import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  countMembers,
  createFast,
  getFastDay,
  getMyFast,
  joinFast,
  listCheckedDays,
  listCheckInCounts,
  listFastDays,
  listGroup,
  listMyFasts,
  previewFast,
  updateFastDay,
  type FastDayContent,
} from './api';
import { isValidJoinCode } from './join-code';
import { CHECK_IN_MUTATION, keys, type CheckInInput } from './query-client';

export { keys };


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
 * Check in (or undo) for a day. The behaviour (instant update, offline queue,
 * rollback on failure) is defined once in query-client.ts.
 */
export function useSetCheckedIn() {
  return useMutation<unknown, Error, CheckInInput>({ mutationKey: CHECK_IN_MUTATION });
}

export function useCheckInCounts(fastId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.checkInCounts(fastId),
    queryFn: () => listCheckInCounts(fastId),
    enabled,
  });
}

export function useGroup(fastId: string, dayNumber: number | null) {
  return useQuery({
    queryKey: keys.group(fastId, dayNumber ?? 0),
    queryFn: () => listGroup(fastId, dayNumber as number),
    enabled: dayNumber !== null,
  });
}
