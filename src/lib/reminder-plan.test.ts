import { describe, expect, it } from 'vitest';

import { planReminders } from './reminder-plan';

const base = {
  fastName: 'Sunrise 21',
  startDate: '2027-01-04',
  lengthDays: 7,
  days: [
    { day_number: 1, scripture_ref: 'Joel 2:12–13', prayer_focus: 'Return to God.' },
    { day_number: 2, scripture_ref: 'Matthew 6:16–18', prayer_focus: '' },
  ],
  reminderTime: '06:30:00',
};

describe('planReminders', () => {
  it('plans one reminder per day at the chosen local time', () => {
    const plan = planReminders({ ...base, now: new Date(2027, 0, 1, 12) });
    expect(plan).toHaveLength(7);
    expect(plan[0].at).toEqual(new Date(2027, 0, 4, 6, 30));
    expect(plan[6].at).toEqual(new Date(2027, 0, 10, 6, 30));
  });

  it("carries the day's scripture and prayer focus", () => {
    const plan = planReminders({ ...base, now: new Date(2027, 0, 1, 12) });
    expect(plan[0]).toMatchObject({
      dayNumber: 1,
      title: 'Sunrise 21 · Day 1',
      body: 'Joel 2:12–13 · Return to God.',
    });
    expect(plan[1].body).toBe('Matthew 6:16–18');
    expect(plan[2].body).toBe("Today's scripture and prayer focus are ready.");
  });

  it('skips times that have already passed, including earlier today', () => {
    const plan = planReminders({ ...base, now: new Date(2027, 0, 6, 7, 0) });
    expect(plan.map((r) => r.dayNumber)).toEqual([4, 5, 6, 7]);
  });

  it('plans nothing without a reminder time or after the fast', () => {
    expect(planReminders({ ...base, reminderTime: null, now: new Date(2027, 0, 1) })).toEqual([]);
    expect(planReminders({ ...base, now: new Date(2027, 1, 1) })).toEqual([]);
  });

  it('stays under the iOS limit on pending notifications', () => {
    const plan = planReminders({ ...base, lengthDays: 40, now: new Date(2027, 0, 1) });
    expect(plan.length).toBe(40);
    expect(plan.length).toBeLessThanOrEqual(60);
  });
});
