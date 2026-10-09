/**
 * Dates for Pitch pin, as YYYY-MM-DD strings in UTC. The scripts run in UTC
 * and the library's New badge is worked out on the server, so every browser
 * sees the same thing.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ms = (date: string): number => Date.parse(`${date}T00:00:00Z`);

/** A real calendar date in YYYY-MM-DD. Also what keeps an id from being a path. */
export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = ms(s);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export const utcToday = (now = new Date()): string => now.toISOString().slice(0, 10);
export const addDays = (date: string, n: number): string => new Date(ms(date) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string): number => Math.round((ms(to) - ms(from)) / 86400000);

/** The Monday that ends the Tuesday-to-Monday week holding the date: Monday night games finish the weekend's round. */
export function weekEnd(date: string): string {
  const day = new Date(ms(date)).getUTCDay(); // 0 Sunday … 6 Saturday
  return addDays(date, (8 - day) % 7);
}

/** The season a date falls in, by its start year. July on is the new season. */
export const seasonOf = (date: string): number => Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) >= 7 ? 0 : 1);
const nextYear = (start: number): string => String((start + 1) % 100).padStart(2, '0');
/** "2026-27", for ids and pack files. */
export const seasonTag = (start: number): string => `${start}-${nextYear(start)}`;
/** "2026/27", for people. */
export const seasonLabel = (start: number): string => `${start}/${nextYear(start)}`;

/** "2026-09" (or a full date) → "September". */
export const monthName = (date: string): string => MONTH_NAMES[Number(date.slice(5, 7)) - 1]!;

/** A run of match dates as a pack title: "17–19 October", "30 September – 6 October", "17 October". */
export function spanTitle(first: string, last: string): string {
  const d1 = Number(first.slice(8, 10));
  const d2 = Number(last.slice(8, 10));
  const m1 = monthName(first);
  const m2 = monthName(last);
  if (first === last) return `${d2} ${m2}`;
  return m1 === m2 ? `${d1}–${d2} ${m2}` : `${d1} ${m1} – ${d2} ${m2}`;
}
