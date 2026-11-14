import type { StoredBoard, StoredDay } from './types';

/**
 * Read the season: the daily run's own board a day (docs/daily-run.md,
 * section 2). The whole line shows from the start inside a five-season
 * window; the player names the club (three guesses, a hint after each miss),
 * then picks the season in the window.
 *
 * The run's boards are mid-fame stories, never the famous ones: with the
 * whole line showing, Leicester 15/16 is a giveaway. And no board is the
 * run's and the daily's within BOARD_GAP days of each other, either way.
 */
export const RUN_SL_START = '2026-11-13';
export const RUN_SL_FIRST = 2000;
/** Story score + 2 × fame must stay under this: the iconic seasons are the daily's. */
export const RUN_SL_FAME_CAP = 5;
export const BOARD_GAP = 60;
/** The same club is not the run's board again within this many days. */
const CLUB_GAP = 10;
export const WINDOW = 5;
export const RUN_GUESSES = 3;
/** Club named on guess 1, 2, 3; the season exact, or one off. */
export const CLUB_POINTS = [80, 55, 30] as const;
export const SEASON_EXACT = 20;
export const SEASON_NEAR = 10;

/** A run day: the board and the first season of its window. */
export interface RunSlDay { date: string; board: string; from: number }

export const runPool = (boards: readonly StoredBoard[]): StoredBoard[] =>
  boards.filter((b) => b.start >= RUN_SL_FIRST && b.stories.length > 0 && !b.stories.includes('title') && b.score + 2 * b.fame < RUN_SL_FAME_CAP);

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86_400_000).toISOString().slice(0, 10);
const apart = (a: string, b: string) => Math.abs(Math.round((dayMs(b) - dayMs(a)) / 86_400_000));

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** True when `board` is on either schedule within BOARD_GAP days of `date`. */
export const clashes = (board: string, date: string, ...schedules: readonly (readonly { date: string; board: string }[])[]): boolean =>
  schedules.some((s) => s.some((d) => d.board === board && d.date !== date && apart(d.date, date) < BOARD_GAP));

/** The window's first season: the answer's place in it is drawn per date, so the middle is no tell. */
export function windowFrom(board: StoredBoard, date: string, first: number, last: number): number {
  const lo = Math.max(first, board.start - (WINDOW - 1));
  const hi = Math.min(board.start, last - (WINDOW - 1));
  return lo + (hash(`${date}|${board.id}`) % (hi - lo + 1));
}

/** What is wrong with one run day. Empty when it keeps every promise. */
export function problems(boards: readonly StoredBoard[], day: RunSlDay, run: readonly RunSlDay[], daily: readonly StoredDay[], first: number, last: number): string[] {
  const b = runPool(boards).find((x) => x.id === day.board);
  if (!b) return [`${day.date}: ${day.board} is not a run board`];
  const out: string[] = [];
  if (clashes(day.board, day.date, run, daily)) out.push(`${day.date}: ${day.board} within ${BOARD_GAP} days on a schedule`);
  if (day.from > b.start || day.from + WINDOW - 1 < b.start || day.from < first || day.from + WINDOW - 1 > last) out.push(`${day.date}: bad window ${day.from}`);
  return out;
}

/**
 * The run schedule through `upTo`, keeping the days there. Each day takes
 * the run board unseen longest (never seen first), a club not used in the
 * last CLUB_GAP days, clear of both schedules; ties fixed per date.
 */
export function extendRun(boards: readonly StoredBoard[], run: readonly RunSlDay[], daily: readonly StoredDay[], upTo: string, first: number, last: number): RunSlDay[] {
  const pool = runPool(boards);
  const byId = new Map(boards.map((b) => [b.id, b]));
  const out = [...run];
  const lastSeen = new Map(out.map((d) => [d.board, d.date]));
  for (let date = out.length ? addDays(out[out.length - 1]!.date, 1) : RUN_SL_START; date <= upTo; date = addDays(date, 1)) {
    const clubs = new Set(out.slice(-CLUB_GAP).map((d) => byId.get(d.board)?.club));
    const queue = pool
      .filter((b) => !clubs.has(b.club) && !clashes(b.id, date, out, daily))
      .sort((a, b) => (lastSeen.get(a.id) ?? '').localeCompare(lastSeen.get(b.id) ?? '') || hash(date + a.id) - hash(date + b.id));
    const pick = queue[0];
    if (!pick) throw new Error(`run season: no board fits ${date}`);
    out.push({ date, board: pick.id, from: windowFrom(pick, date, first, last) });
    lastSeen.set(pick.id, date);
  }
  return out;
}

/** The task score: the club on guess 1, 2 or 3 (0 if never), plus the season, exact or one off. */
export function runScore(clubAt: number | null, seasonOff: number | null): number {
  const club = clubAt !== null && clubAt >= 1 && clubAt <= RUN_GUESSES ? CLUB_POINTS[clubAt - 1]! : 0;
  const season = seasonOff === 0 ? SEASON_EXACT : seasonOff === 1 ? SEASON_NEAR : 0;
  return club + season;
}
