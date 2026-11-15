/** A time of day as the app passes it around: 24-hour "HH:MM". */
export type TimeOfDay = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Reads a typed time such as "7:05" or "19.30". Null when it is not a time. */
export function parseTimeOfDay(text: string): TimeOfDay | null {
  const match = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** The time on today's date, for pickers that work in Date objects. */
export function timeToDate(time: TimeOfDay): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToTime(date: Date): TimeOfDay {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The time as the device writes it, such as "6:30 am" or "06:30". */
export function formatTimeOfDay(time: TimeOfDay): string {
  return timeToDate(time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
