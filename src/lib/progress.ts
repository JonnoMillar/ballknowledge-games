import type { PlateMark } from './chain/share';
import type { Grade } from './chain/grade';

/**
 * What the player has done, kept in the browser.
 *
 * No accounts and no server: a play is written to localStorage when the
 * board is sealed, and the streak is read back out of the plays. The first
 * seal of a board is the one that counts; a replay is allowed and changes
 * nothing here.
 */
export interface Play {
  /** The daily's day number when this board was played as the daily, else null. */
  day: number | null;
  held: boolean;
  /** Link by link, for drawing the board. */
  links: boolean[];
  /** Plate by plate, for the share line: held, held with a hint, missed. */
  plates: PlateMark[];
  /** Plate by plate, the Deep Cuts grade; null where it broke. Absent on older plays. */
  grades?: (Grade | null)[];
  /** The local date it was played, YYYY-MM-DD. */
  date: string;
}

export interface Progress {
  plays: Record<string, Play>;
}

const KEY = 'chain.progress.v1';

export function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { plays: {} };
    const parsed = JSON.parse(raw) as Progress;
    return parsed && typeof parsed.plays === 'object' ? parsed : { plays: {} };
  } catch {
    return { plays: {} };
  }
}

export function recordPlay(boardId: string, play: Play): Progress {
  const progress = readProgress();
  if (progress.plays[boardId]) return progress;
  progress.plays[boardId] = play;
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* private mode, or full */ }
  return progress;
}

/**
 * The streak: consecutive daily days held, ending today or yesterday.
 *
 * Yesterday counts so the streak still shows before today's board is
 * played; a day missed, or a day broken, ends it. `best` is the longest
 * run in the history.
 */
export function streakOf(progress: Progress, today: number): { current: number; best: number } {
  const held = new Set<number>();
  for (const p of Object.values(progress.plays)) if (p.day !== null && p.held) held.add(p.day);
  let current = 0;
  const start = held.has(today) ? today : held.has(today - 1) ? today - 1 : null;
  if (start !== null) for (let d = start; held.has(d); d--) current++;
  let best = 0;
  for (const d of held) if (!held.has(d - 1)) { let n = 0; for (let e = d; held.has(e); e++) n++; best = Math.max(best, n); }
  return { current, best };
}
