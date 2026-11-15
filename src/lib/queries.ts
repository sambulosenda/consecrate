import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  countMembers,
  createFast,
  getFastDay,
  getMyFast,
  joinFast,
  leaveFast,
  listCheckedDays,
  listCheckInCounts,
  listFastDays,
  listGroup,
  listMyFasts,
  previewFast,
  updateFastDay,
  updateMember,
  type FastDayContent,
  type MemberSettings,
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

export function useUpdateMember(memberId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (settings: MemberSettings) => updateMember(memberId, settings),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.myFasts }),
  });
}

export function useLeaveFast(fastId: string, memberId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => leaveFast(memberId),
    onSuccess: () => {
      // Nothing of theirs should linger on the phone, including any check-in
      // still waiting to be sent, which the server would now refuse.
      client
        .getMutationCache()
        .findAll({
          mutationKey: CHECK_IN_MUTATION,
          predicate: (m) => (m.state.variables as CheckInInput | undefined)?.memberId === memberId,
        })
        .forEach((m) => client.getMutationCache().remove(m));
      client.removeQueries({ queryKey: keys.checkedDays(memberId) });
      client.removeQueries({ queryKey: ['group', fastId] });
      return client.invalidateQueries({ queryKey: keys.myFasts });
    },
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
