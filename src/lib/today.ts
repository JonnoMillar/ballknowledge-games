import { localDate } from './daily';

/**
 * Which games this browser has finished today, for the hub. A game marks
 * itself done; the hub only reads. One date per game, so it never grows.
 */
const KEY = 'games.done.v1';

function read(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>; } catch { return {}; }
}

export function markDone(game: string, date = localDate()): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [game]: date })); } catch { /* private mode, or full */ }
}

export function doneOn(game: string, date = localDate()): boolean {
  return read()[game] === date;
}
