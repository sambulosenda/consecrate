import { describe, expect, it } from 'vitest';

import { isValidJoinCode, joinCodeFromUrl, normalizeJoinCode } from './join-code';

describe('normalizeJoinCode', () => {
  it('upper-cases and strips separators', () => {
    expect(normalizeJoinCode(' k7m-2qx ')).toBe('K7M2QX');
  });

  it('drops characters that are never issued', () => {
    expect(normalizeJoinCode('K0O1ILM')).toBe('KM');
  });

  it('stops at six characters', () => {
    expect(normalizeJoinCode('K7M2QXABC')).toBe('K7M2QX');
  });
});

describe('isValidJoinCode', () => {
  it('accepts a well-formed code', () => {
    expect(isValidJoinCode('K7M2QX')).toBe(true);
  });

  it.each(['', 'K7M2Q', 'K7M2QXA', 'k7m2qx', 'K7M2Q0', 'K7M2QI'])('rejects %j', (code) => {
    expect(isValidJoinCode(code)).toBe(false);
  });
});

describe('joinCodeFromUrl', () => {
  it('reads the code from a share link', () => {
    expect(joinCodeFromUrl('consecrate://join/k7m2qx')).toBe('K7M2QX');
    expect(joinCodeFromUrl('https://example.org/join/K7M2QX?utm=1')).toBe('K7M2QX');
  });

  it('returns null when there is no usable code', () => {
    expect(joinCodeFromUrl('consecrate://join/abc')).toBeNull();
    expect(joinCodeFromUrl('consecrate://fast/123')).toBeNull();
  });
});
