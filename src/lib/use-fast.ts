import { fastProgress, type FastProgress } from './dates';
import { useMyFast } from './queries';
import { useToday } from './use-today';

/**
 * What every screen inside a fast needs: the fast, this device's role in it,
 * and where the fast stands today.
 */
export function useFast(fastId: string) {
  const query = useMyFast(fastId);
  const today = useToday();
  const fast = query.data?.fast ?? null;
  const progress: FastProgress | null = fast
    ? fastProgress(fast.start_date, fast.length_days, today)
    : null;

  return {
    query,
    fast,
    member: query.data?.member ?? null,
    isLeader: query.data?.isLeader ?? false,
    today,
    progress,
    /** Today's day number while the fast is running, otherwise null. */
    dayNumber: progress?.phase === 'active' ? progress.dayNumber : null,
  };
}
