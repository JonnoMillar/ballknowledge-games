/**
 * Which board is today's.
 *
 * Day 1 is the day the daily launched. The days already served are pinned
 * (PINNED); every later day is drawn by `schedule`, the same for everyone and
 * with no server to remember anything, in a way that adding or retiring a
 * board only ever changes days from that date on.
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

/** Day 1 on the epoch, counting up. Before the epoch is day 0 or below. Pitch pin passes its own epoch. */
export function dayNumber(date: string, epoch = EPOCH): number {
  return utcDay(date) - utcDay(epoch) + 1;
}

export function dateOfDay(day: number, epoch = EPOCH): string {
  const ms = (utcDay(epoch) + day - 1) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** A date as an archive tile prints it: "19 Sept". */
export function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** A date as the page prints it: "19 September 2026". */
export function longDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * A fixed shuffle: the same ids in the same order on every machine.
 *
 * This was the whole schedule until 2026-10-20: day d took the d-th board of
 * the shuffled set. Adding or retiring any board reshuffled every date,
 * already-played ones included, so it now only records how PINNED was made.
 */
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

/**
 * Days 1 to 34 (19 Sept to 22 Oct 2026), exactly as dailyOrder served them
 * over the 57 boards of the day the schedule was pinned. History: nothing
 * changes these. 34 rather than the 32 days played when it was written, so
 * that a player a day or two ahead in UTC+14 is covered while it ships.
 */
export const PINNED: readonly string[] = [
  '044', '061', '041', '026', '032', '071', '043', '014', '021', '033',
  '049', '020', '057', '015', '053', '068', '060', '023', '035', '067',
  '031', '056', '065', '052', '017', '036', '046', '048', '029', '042',
  '010', '050', '063', '045',
];

/** A daily board, with its window. See ChainPuzzle's `from` and `until`. */
export interface DailyBoard { id: string; from?: string; until?: string }

const live = (b: DailyBoard, day: number): boolean =>
  (b.from === undefined || day >= dayNumber(b.from)) && (b.until === undefined || day < dayNumber(b.until));

/** A per-id rank, so a board's place depends on its own id and nothing else (FNV-1a). */
const rank = (id: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

/**
 * The board for every day from 1 to `through`; index 0 is day 1. Null on a
 * day with no live board.
 *
 * After PINNED, each day is drawn from the boards live that day that have
 * not come up yet in the current cycle: boards never served first, then by
 * rank. When every live board has come up, a new cycle starts, never with
 * yesterday's board. Every day depends only on the days before it and the
 * boards live on it, so adding a board (with `from`) or retiring one (with
 * `until`) moves nothing before that date.
 */
export function schedule(boards: readonly DailyBoard[], through: number): (string | null)[] {
  const out: (string | null)[] = PINNED.slice(0, Math.max(0, through));
  const ever = new Set(PINNED);
  let cycle = new Set(PINNED);
  for (let day = PINNED.length + 1; day <= through; day++) {
    const today = boards.filter((b) => live(b, day)).map((b) => b.id);
    let fresh = today.filter((id) => !cycle.has(id));
    if (fresh.length === 0 && today.length > 0) {
      cycle = new Set();
      const yesterday = out[out.length - 1];
      fresh = today.length > 1 ? today.filter((id) => id !== yesterday) : today;
    }
    const unseen = fresh.filter((id) => !ever.has(id));
    const pick = (unseen.length ? unseen : fresh).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0] ?? null;
    if (pick) { cycle.add(pick); ever.add(pick); }
    out.push(pick);
  }
  return out;
}

export function boardForDay(day: number, boards: readonly DailyBoard[]): string | null {
  if (day < 1) return null;
  return schedule(boards, day)[day - 1] ?? null;
}

/** The most recent day on or before `today` that a board was the daily, or null. */
export function dayOfBoard(id: string, boards: readonly DailyBoard[], today: number): number | null {
  const i = schedule(boards, today).lastIndexOf(id);
  return i < 0 ? null : i + 1;
}
