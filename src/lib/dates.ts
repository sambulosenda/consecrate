/**
 * Date helpers. A fast's days are calendar days in the member's own time zone:
 * day 1 is the start date wherever you are. Dates travel as 'YYYY-MM-DD'
 * strings and are never turned into UTC instants, which would shift the day
 * for anyone west or east of Greenwich.
 */

export type IsoDate = string; // 'YYYY-MM-DD'

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysSinceEpoch(year: number, month: number, day: number): number {
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function parseIso(date: IsoDate): [number, number, number] {
  const m = ISO.exec(date);
  if (!m) throw new Error(`Not an ISO date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function toIso(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Today's calendar date on this device. */
export function localToday(now: Date = new Date()): IsoDate {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = parseIso(date);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export type FastProgress =
  | { phase: 'upcoming'; daysUntilStart: number }
  | { phase: 'active'; dayNumber: number }
  | { phase: 'finished' };

/** Where a fast stands on a given calendar day. */
export function fastProgress(startDate: IsoDate, lengthDays: number, today: IsoDate): FastProgress {
  const [sy, sm, sd] = parseIso(startDate);
  const [ty, tm, td] = parseIso(today);
  const offset = daysSinceEpoch(ty, tm, td) - daysSinceEpoch(sy, sm, sd);
  if (offset < 0) return { phase: 'upcoming', daysUntilStart: -offset };
  if (offset >= lengthDays) return { phase: 'finished' };
  return { phase: 'active', dayNumber: offset + 1 };
}

/**
 * Parses a date typed as day/month/year (the UK order), with /, - or . between
 * the parts and a two- or four-digit year. Returns null if it is not a real
 * calendar date.
 */
export function parseDayMonthYear(input: string): IsoDate | null {
  const m = /^\s*(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})\s*$/.exec(input);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return isRealDate(year, month, day) ? toIso(year, month, day) : null;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** 'Monday 4 January' (or with the year when asked). */
export function formatLongDate(date: IsoDate, options: { year?: boolean } = {}): string {
  const [y, m, d] = parseIso(date);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]}${options.year ? ` ${y}` : ''}`;
}
