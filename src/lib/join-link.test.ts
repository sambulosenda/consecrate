import { describe, expect, it } from 'vitest';

import { joinLink, qrMatrix } from './join-link';

describe('joinLink', () => {
  it('points at the join screen for the code', () => {
    expect(joinLink('K7M2QX')).toBe('consecrate://join/K7M2QX');
  });
});

describe('qrMatrix', () => {
  const matrix = qrMatrix(joinLink('K7M2QX'));

  it('is square and small enough to draw quickly', () => {
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix.length).toBeLessThanOrEqual(33);
    for (const row of matrix) expect(row).toHaveLength(matrix.length);
  });

  it('has the three corner finder patterns every QR code starts with', () => {
    const n = matrix.length;
    const finder = (r: number, c: number) =>
      matrix[r][c] && matrix[r][c + 6] && matrix[r + 6][c] && matrix[r + 6][c + 6] && !matrix[r + 1][c + 1] && matrix[r + 3][c + 3];
    expect(finder(0, 0)).toBe(true);
    expect(finder(0, n - 7)).toBe(true);
    expect(finder(n - 7, 0)).toBe(true);
  });

  it('differs between codes', () => {
    expect(qrMatrix(joinLink('ABCDEF'))).not.toEqual(matrix);
  });
});
