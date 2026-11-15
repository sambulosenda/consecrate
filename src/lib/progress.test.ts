import { describe, expect, it } from 'vitest';

import { finishedSummary, memberProgress, progressMessage } from './progress';

describe('memberProgress', () => {
  it('starts empty on day 1', () => {
    expect(memberProgress([], 1)).toEqual({
      daysCompleted: 0, daysElapsed: 1, checkedInToday: false, streak: 0, returning: false,
    });
  });

  it('counts today once checked in', () => {
    const p = memberProgress([1, 2, 3, 4], 4);
    expect(p).toMatchObject({ daysCompleted: 4, checkedInToday: true, streak: 4, returning: false });
  });

  it('keeps the streak alive while today is still open', () => {
    const p = memberProgress([1, 2, 3], 4);
    expect(p).toMatchObject({ daysCompleted: 3, checkedInToday: false, streak: 3, returning: false });
  });

  it('marks a member as returning after a missed day', () => {
    const p = memberProgress([1, 2], 4);
    expect(p).toMatchObject({ daysCompleted: 2, streak: 0, returning: true });
  });

  it('restarts the streak after a gap', () => {
    expect(memberProgress([1, 2, 4, 5], 5).streak).toBe(2);
  });

  it('ignores days outside the fast so far and duplicates', () => {
    expect(memberProgress([0, 2, 2, 9], 3).daysCompleted).toBe(1);
  });
});

describe('progressMessage', () => {
  it('invites a returning member back without counting against them', () => {
    expect(progressMessage(memberProgress([1], 4))).toBe('Pick it back up today.');
  });

  it('states days completed', () => {
    expect(progressMessage(memberProgress([1], 1))).toBe('1 of 1 day completed');
    expect(progressMessage(memberProgress([1, 3], 3))).toBe('2 of 3 days completed');
  });

  it('mentions a run of three or more days', () => {
    expect(progressMessage(memberProgress([1, 2, 3], 3))).toBe('3 of 3 days completed · 3 days in a row');
  });
});

describe('finishedSummary', () => {
  it('counts each day once and ignores days outside the fast', () => {
    expect(finishedSummary([1, 2, 2, 5, 30], 21)).toBe(
      'You checked in on 3 of 21 days. Every day you turned up mattered.',
    );
  });

  it('marks a full fast and stays kind about an empty one', () => {
    expect(finishedSummary([1, 2, 3, 4, 5, 6, 7], 7)).toBe('You checked in on all 7 days.');
    expect(finishedSummary([], 21)).toBe('Thank you for being part of it.');
  });
});
