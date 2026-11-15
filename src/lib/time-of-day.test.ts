import { describe, expect, it } from 'vitest';

import { dateToTime, parseTimeOfDay, timeToDate } from './time-of-day';

describe('parseTimeOfDay', () => {
  it('reads times typed with or without a leading zero', () => {
    expect(parseTimeOfDay('7:05')).toBe('07:05');
    expect(parseTimeOfDay(' 19.30 ')).toBe('19:30');
    expect(parseTimeOfDay('00:00')).toBe('00:00');
  });

  it('refuses anything that is not a time of day', () => {
    for (const text of ['', '7', '24:00', '12:60', '7:5', 'noon', '12:30pm']) {
      expect(parseTimeOfDay(text)).toBeNull();
    }
  });
});

describe('timeToDate and dateToTime', () => {
  it('carry a time through a Date unchanged', () => {
    for (const time of ['00:00', '06:30', '12:05', '23:59']) {
      expect(dateToTime(timeToDate(time))).toBe(time);
    }
  });
});
