import { dayNumber, localDate } from './daily';
import { readProgress } from './progress';

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
}

export function doneToday(): Set<string> {
  const date = localDate();
  const done = new Set(Object.entries(read()).filter(([, d]) => d === date).map(([g]) => g));
  const today = dayNumber(date);
  if (Object.values(readProgress().plays).some((p) => p.day === today)) done.add('chain');
  return done;
}
