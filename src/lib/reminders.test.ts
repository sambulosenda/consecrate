import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlannedReminder } from './reminder-plan';
import { syncReminders } from './reminders';

type Scheduled = { identifier: string; content: { data?: { fastId?: string } } };

const phone = vi.hoisted(() => ({ scheduled: [] as Scheduled[], next: 1 }));

// A stand-in phone. Every call takes a moment, as the real ones do, which is
// what lets two syncs overlap.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-notifications', () => {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 1));
  return {
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    getAllScheduledNotificationsAsync: async () => {
      await pause();
      return [...phone.scheduled];
    },
    cancelScheduledNotificationAsync: async (identifier: string) => {
      await pause();
      phone.scheduled = phone.scheduled.filter((n) => n.identifier !== identifier);
    },
    scheduleNotificationAsync: async (request: { content: Scheduled['content'] }) => {
      await pause();
      phone.scheduled.push({ identifier: String(phone.next++), content: request.content });
    },
  };
});

const plan = (days: number): PlannedReminder[] =>
  Array.from({ length: days }, (_, i) => ({
    dayNumber: i + 1,
    at: new Date(2027, 0, 4 + i, 8),
    title: 'Sunrise 21',
    body: `Day ${i + 1}`,
  }));

const countFor = (fastId: string) =>
  phone.scheduled.filter((n) => n.content.data?.fastId === fastId).length;

describe('syncReminders', () => {
  beforeEach(() => {
    phone.scheduled = [];
    phone.next = 1;
  });

  it('replaces one fast’s reminders and leaves another fast’s alone', async () => {
    await syncReminders('f1', plan(3));
    await syncReminders('f2', plan(2));
    await syncReminders('f1', plan(1));
    expect(countFor('f1')).toBe(1);
    expect(countFor('f2')).toBe(2);
  });

  it('lets a later clear win over a sync that is still scheduling', async () => {
    const earlier = syncReminders('f1', plan(5));
    const clear = syncReminders('f1', []);
    await Promise.all([earlier, clear]);
    expect(countFor('f1')).toBe(0);
  });

  it('does not double up when two syncs overlap', async () => {
    await Promise.all([syncReminders('f1', plan(4)), syncReminders('f1', plan(4))]);
    expect(countFor('f1')).toBe(4);
  });
});
