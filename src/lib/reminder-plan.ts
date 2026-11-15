/**
 * Works out which reminder notifications to schedule. One per remaining day
 * of the fast, each carrying that day's scripture and prayer focus, at the
 * member's chosen time on their own clock. Pure, so it can be tested without
 * a phone; reminders.ts does the scheduling.
 */
import { addDays, type IsoDate } from './dates';

export type PlannedReminder = {
  dayNumber: number;
  at: Date;
  title: string;
  body: string;
};

export type ReminderPlanInput = {
  fastName: string;
  startDate: IsoDate;
  lengthDays: number;
  days: readonly { day_number: number; scripture_ref: string; prayer_focus: string }[];
  /** 'HH:MM' or 'HH:MM:SS', or null when the member wants no reminders. */
  reminderTime: string | null;
  now: Date;
};

/** iOS keeps at most 64 pending local notifications per app. */
export const MAX_SCHEDULED = 60;

export function planReminders(input: ReminderPlanInput): PlannedReminder[] {
  if (!input.reminderTime) return [];
  const time = /^(\d{1,2}):(\d{2})/.exec(input.reminderTime);
  if (!time) return [];
  const hour = Number(time[1]);
  const minute = Number(time[2]);

  const contentByDay = new Map(input.days.map((d) => [d.day_number, d]));
  const planned: PlannedReminder[] = [];

  for (let dayNumber = 1; dayNumber <= input.lengthDays; dayNumber++) {
    const [y, m, d] = addDays(input.startDate, dayNumber - 1).split('-').map(Number);
    const at = new Date(y, m - 1, d, hour, minute, 0, 0);
    if (at.getTime() <= input.now.getTime()) continue;

    const content = contentByDay.get(dayNumber);
    const body = [content?.scripture_ref, content?.prayer_focus]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' · ');

    planned.push({
      dayNumber,
      at,
      title: `${input.fastName} · Day ${dayNumber}`,
      body: body || "Today's scripture and prayer focus are ready.",
    });
  }

  return planned.slice(0, MAX_SCHEDULED);
}
