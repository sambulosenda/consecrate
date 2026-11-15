/**
 * Daily reminders, scheduled on the device. No server is involved: the phone
 * holds one notification per remaining day of the fast and delivers them
 * itself, so reminders work offline and nothing about the member leaves it.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedReminder } from './reminder-plan';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Asks for permission if it has not been decided yet. Returns whether it is granted. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  // Android 13 and later only shows the prompt once the app has a channel.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Daily reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// Each sync cancels and then schedules, one notification at a time. Run one
// after another, so a later "clear" can never be overtaken by an earlier
// sync that is still scheduling.
let queue: Promise<void> = Promise.resolve();

/**
 * Replaces one fast's scheduled reminders with the given plan, leaving any
 * other fast's alone. Safe to call often: it is how edits to a day's content,
 * a new reminder time or leaving a fast reach the notifications. Does nothing
 * (and never prompts) without permission.
 *
 * iOS holds at most 64 pending notifications per app and keeps the soonest,
 * so someone in several long fasts at once is reminded of the nearest days.
 */
export function syncReminders(fastId: string, plan: readonly PlannedReminder[]): Promise<void> {
  if (!supported) return Promise.resolve();
  const run = queue.then(() => replaceReminders(fastId, plan));
  queue = run.catch(() => {});
  return run;
}

async function replaceReminders(fastId: string, plan: readonly PlannedReminder[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const existing of scheduled) {
    if (existing.content.data?.fastId === fastId) {
      await Notifications.cancelScheduledNotificationAsync(existing.identifier);
    }
  }
  if (plan.length === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body, data: { fastId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
    });
  }
}
