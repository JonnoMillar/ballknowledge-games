import type { StoredBoard, StoredDay } from './types';

/**
 * The daily's schedule: one board a date, append-only, kept ahead by the
 * update script. A finished season adds its boards to the queue, and a past
 * day never changes.
 */
/** Day 1. A draft date: reset it when the game launches. */
export const EPOCH = '2026-10-15';
export const FIRST_DAILY_SEASON = 2000;
export const MIN_AHEAD = 14;
export const TOP_UP = 60;
/** The same club is not the daily again within this many days; nor the same season within SEASON_GAP. */
const CLUB_GAP = 10;
const SEASON_GAP = 4;
/** A daily needs a good story at a known club (story score + 2 x fame); endless takes anything with a story. */
export const DAILY_SCORE = 3;

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / 86400000);

export const dailyPool = (boards: readonly StoredBoard[]) =>
  boards.filter((b) => b.start >= FIRST_DAILY_SEASON && b.score + 2 * b.fame >= DAILY_SCORE);

/** FNV-1a, for a tie-break that is fixed per date. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/**
 * Extend the schedule to `upTo`. Each day takes the board unseen longest
 * (never seen first), best story and best-known club first, skipping a club
 * or season used too recently.
 */
export function extend(boards: readonly StoredBoard[], days: readonly StoredDay[], upTo: string, start = EPOCH): StoredDay[] {
  const pool = dailyPool(boards);
  if (pool.length === 0) throw new Error('no daily boards');
  const byId = new Map(boards.map((b) => [b.id, b]));
  const out = [...days];
  const lastSeen = new Map(out.map((d) => [d.board, d.date]));
  for (let date = out.length ? addDays(out[out.length - 1]!.date, 1) : start; date <= upTo; date = addDays(date, 1)) {
    const recent = out.slice(-CLUB_GAP).map((d) => byId.get(d.board)).filter((b): b is StoredBoard => !!b);
    const clubs = new Set(recent.map((b) => b.club));
    const seasons = new Set(recent.slice(-SEASON_GAP).map((b) => b.season));
    const rank = (b: StoredBoard) => b.score + 2 * b.fame + (hash(date + b.id) % 100) / 100;
    const queue = [...pool].sort((a, b) =>
      (lastSeen.get(a.id) ?? '').localeCompare(lastSeen.get(b.id) ?? '') || rank(b) - rank(a));
    const pick = queue.find((b) => !clubs.has(b.club) && !seasons.has(b.season)) ?? queue[0]!;
    out.push({ date, board: pick.id });
    lastSeen.set(pick.id, date);
  }
  return out;
}
