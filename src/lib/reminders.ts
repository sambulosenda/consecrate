/**
 * Daily reminders, scheduled on the device. No server is involved: the phone
 * holds one notification per remaining day of the fast and delivers them
 * itself, so reminders work offline and nothing about the member leaves it.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedReminder } from './reminder-plan';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Asks for permission if it has not been decided yet. Returns whether it is granted. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Replaces everything scheduled with the given plan. Safe to call often: it is
 * how edits to a day's content, a new reminder time or leaving a fast reach
 * the notifications. Does nothing (and never prompts) without permission.
 */
export async function syncReminders(plan: readonly PlannedReminder[]): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (plan.length === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
    });
  }
}
