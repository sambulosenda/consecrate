import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  countMembers,
  createFast,
  getFastDay,
  getMyFast,
  joinFast,
  listMyFasts,
  previewFast,
} from './api';
import { isValidJoinCode } from './join-code';

export const keys = {
  myFasts: ['my-fasts'] as const,
  myFast: (fastId: string) => ['my-fasts', fastId] as const,
  preview: (code: string) => ['fast-preview', code] as const,
  day: (fastId: string, dayNumber: number) => ['fast-day', fastId, dayNumber] as const,
  memberCount: (fastId: string) => ['member-count', fastId] as const,
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
