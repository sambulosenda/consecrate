import { describe, expect, it } from 'vitest';

import { addDays, fastProgress, formatLongDate, localToday, parseDayMonthYear } from './dates';

describe('fastProgress', () => {
  const start = '2027-01-04';

  it('is upcoming before the start date', () => {
    expect(fastProgress(start, 21, '2027-01-01')).toEqual({ phase: 'upcoming', daysUntilStart: 3 });
  });

  it('is day 1 on the start date', () => {
    expect(fastProgress(start, 21, '2027-01-04')).toEqual({ phase: 'active', dayNumber: 1 });
  });

  it('counts calendar days', () => {
    expect(fastProgress(start, 21, '2027-01-07')).toEqual({ phase: 'active', dayNumber: 4 });
  });

  it('is active on the last day and finished the day after', () => {
    expect(fastProgress(start, 21, '2027-01-24')).toEqual({ phase: 'active', dayNumber: 21 });
    expect(fastProgress(start, 21, '2027-01-25')).toEqual({ phase: 'finished' });
  });

  it('is not thrown by the clocks changing mid-fast', () => {
    // UK clocks go forward on 28 March 2027.
    expect(fastProgress('2027-03-20', 21, '2027-03-29')).toEqual({ phase: 'active', dayNumber: 10 });
  });
});

describe('parseDayMonthYear', () => {
  it('reads day/month/year', () => {
    expect(parseDayMonthYear('4/1/2027')).toBe('2027-01-04');
    expect(parseDayMonthYear('04-01-27')).toBe('2027-01-04');
    expect(parseDayMonthYear(' 4.1.2027 ')).toBe('2027-01-04');
  });

  it('rejects dates that do not exist', () => {
    expect(parseDayMonthYear('31/2/2027')).toBeNull();
    expect(parseDayMonthYear('29/2/2027')).toBeNull();
    expect(parseDayMonthYear('1/13/2027')).toBeNull();
    expect(parseDayMonthYear('tomorrow')).toBeNull();
  });

  it('accepts a real leap day', () => {
    expect(parseDayMonthYear('29/2/2028')).toBe('2028-02-29');
  });
});

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-04', 20)).toBe('2027-01-24');
  });
});

describe('formatLongDate', () => {
  it('names the weekday and month', () => {
    expect(formatLongDate('2027-01-04')).toBe('Monday 4 January');
    expect(formatLongDate('2027-01-07', { year: true })).toBe('Thursday 7 January 2027');
  });
});

describe('localToday', () => {
  it('uses the device calendar date, not UTC', () => {
    expect(localToday(new Date(2027, 0, 4, 23, 59))).toBe('2027-01-04');
    expect(localToday(new Date(2027, 0, 5, 0, 1))).toBe('2027-01-05');
  });
});
