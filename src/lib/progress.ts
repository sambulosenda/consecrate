/**
 * What a member has done so far, worked out from the day numbers they have
 * checked in on. Kept free of pressure on purpose: there is no penalty for a
 * missed day, only an invitation to pick the fast back up.
 */

export type MemberProgress = {
  /** Days checked in, counting today if it is done. */
  daysCompleted: number;
  /** Days of the fast that have arrived so far, including today. */
  daysElapsed: number;
  checkedInToday: boolean;
  /** Consecutive days checked in, ending today (or yesterday if today is still open). */
  streak: number;
  /** True when today is open and yesterday was missed. */
  returning: boolean;
};

export function memberProgress(checkedDays: readonly number[], today: number): MemberProgress {
  const done = new Set(checkedDays.filter((d) => d >= 1 && d <= today));
  const checkedInToday = done.has(today);

  let streak = 0;
  for (let day = checkedInToday ? today : today - 1; day >= 1 && done.has(day); day--) streak++;

  return {
    daysCompleted: done.size,
    daysElapsed: today,
    checkedInToday,
    streak,
    returning: !checkedInToday && today > 1 && !done.has(today - 1),
  };
}

/** The one line shown under the check-in button. */
export function progressMessage(p: MemberProgress): string {
  if (p.returning) return 'Pick it back up today.';
  const days = `${p.daysCompleted} of ${p.daysElapsed} ${p.daysElapsed === 1 ? 'day' : 'days'} completed`;
  return p.streak >= 3 ? `${days} · ${p.streak} days in a row` : days;
}

/** The line a member sees once the fast is over. No score, only thanks. */
export function finishedSummary(checkedDays: readonly number[], lengthDays: number): string {
  const done = new Set(checkedDays.filter((d) => d >= 1 && d <= lengthDays)).size;
  if (done === 0) return 'Thank you for being part of it.';
  if (done === lengthDays) return `You checked in on all ${lengthDays} days.`;
  return `You checked in on ${done} of ${lengthDays} days. Every day you turned up mattered.`;
}
