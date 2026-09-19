/**
 * Which board is today's.
 *
 * Day 1 is the day the daily launched. Each day after that takes the next
 * board from a seeded shuffle of the completion set, so the order is fixed
 * for everyone, is not the order the files were written in, and needs no
 * server to remember anything. When the set runs out it wraps, which is
 * what the generator exists to prevent.
 */
export const EPOCH = '2026-09-19';

/** A calendar date in the player's own time zone, as YYYY-MM-DD. */
export function localDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const utcDay = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

/** Day 1 on the epoch, counting up. Before the epoch is day 0 or below. */
export function dayNumber(date: string): number {
  return utcDay(date) - utcDay(EPOCH) + 1;
}

export function dateOfDay(day: number): string {
  const ms = (utcDay(EPOCH) + day - 1) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** A fixed shuffle: the same ids in the same order on every machine. */
export function dailyOrder(ids: readonly string[]): string[] {
  const out = [...ids].sort();
  let s = 0x9e3779b9;
  const rand = () => { s = (Math.imul(s ^ (s >>> 16), 0x45d9f3b) ^ 0x2545f491) >>> 0; return s / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function boardForDay(day: number, ids: readonly string[]): string | null {
  if (ids.length === 0 || day < 1) return null;
  const order = dailyOrder(ids);
  return order[(day - 1) % order.length]!;
}

/** The day a board is (or was) the daily, or null if it never comes up before `today`. */
export function dayOfBoard(id: string, ids: readonly string[], today: number): number | null {
  const order = dailyOrder(ids);
  const i = order.indexOf(id);
  if (i < 0) return null;
  // The most recent day on or before today that landed on this board.
  const day = i + 1;
  if (day > today) return null;
  const cycles = Math.floor((today - day) / order.length);
  return day + cycles * order.length;
}
