import { dayNumber, localDate } from './daily';
import { readProgress, streakOf } from './progress';

/**
 * Which dailies this browser has finished today, for the hubs. A game marks
 * itself done; the hubs only read. One date per game, so it never grows.
 * Chain's puzzle keeps its own record, so it is read from there.
 */
const KEY = 'games.done.v1';

function read(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>; } catch { return {}; }
}

export function markDone(game: string, date = localDate()): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [game]: date })); } catch { /* private mode, or full */ }
  syncHub();
}

export function doneToday(): Set<string> {
  const date = localDate();
  const done = new Set(Object.entries(read()).filter(([, d]) => d === date).map(([g]) => g));
  const today = dayNumber(date);
  if (Object.values(readProgress().plays).some((p) => p.day === today)) done.add('chain');
  return done;
}

/** What the site hub shows: today's finished dailies and Chain's streak. */
export type HubStatus = { done: string[]; streak: number };
export const NOTHING_DONE: HubStatus = { done: [], streak: 0 };

export function hubStatus(): HubStatus {
  return { done: [...doneToday()].sort(), streak: streakOf(readProgress(), dayNumber(localDate())).current };
}

/**
 * The hub's state, mirrored into a cookie so the server lays the board out
 * as it really is. A page coming back to the hub then lands on the true
 * board, and nothing moves once the tile has shrunk home. Call after any
 * change to what the hub shows (markDone does; so does Chain's seal).
 */
const COOKIE = 'hub';

export function syncHub(): void {
  try {
    const value = { date: localDate(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ...hubStatus() };
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=172800; samesite=lax`;
  } catch { /* cookies off */ }
}

/** Server side: the cookie's status if it was written on the browser's today, else nothing done. */
export function readHubCookie(raw: string | undefined, now = new Date()): HubStatus {
  if (!raw) return NOTHING_DONE;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as { date?: unknown; tz?: unknown; done?: unknown; streak?: unknown };
    if (typeof v.tz !== 'string' || !Array.isArray(v.done) || typeof v.streak !== 'number') return NOTHING_DONE;
    // en-CA formats as YYYY-MM-DD, the same as localDate().
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: v.tz }).format(now);
    if (v.date !== today) return NOTHING_DONE;
    return { done: v.done.filter((d): d is string => typeof d === 'string').sort(), streak: v.streak };
  } catch {
    return NOTHING_DONE;
  }
}

export { COOKIE as HUB_COOKIE };
