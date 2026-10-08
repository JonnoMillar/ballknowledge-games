import { dayNumber } from '../../../src/lib/daily';
import { isDate, PIN_EPOCH } from './boards';
import type { Spot } from './pitch';
import type { Answer } from './types';

/**
 * What the player has done, kept in the browser. No accounts: a throw is
 * written when the answer comes back, and the first throw at a goal is the
 * one that counts. A refresh resumes from here.
 */
export interface Throw { pin: Spot; answer: Answer }
/** `finished` is the local date the last pin landed, or null. */
export interface PinPlay { throws: (Throw | null)[]; finished: string | null }
export type Store = Record<string, PinPlay>;

const KEY = 'pin.progress.v1';

export function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

export function recordThrow(board: string, n: number, i: number, t: Throw, today: string): Store {
  const store = readStore();
  const old = store[board];
  const play: PinPlay = old && old.throws.length === n ? old : { throws: Array<Throw | null>(n).fill(null), finished: null };
  if (!play.throws[i]) play.throws[i] = t;
  if (play.finished === null && play.throws.every(Boolean)) play.finished = today;
  store[board] = play;
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode, or full */ }
  return store;
}

/** Consecutive dailies finished on their own day, ending today or yesterday. Packs do not count. */
export function streakOf(store: Store, today: string): number {
  const days = new Set<number>();
  for (const [id, p] of Object.entries(store)) if (isDate(id) && p.finished === id) days.add(dayNumber(id, PIN_EPOCH));
  const t = dayNumber(today, PIN_EPOCH);
  let d = days.has(t) ? t : t - 1;
  let n = 0;
  while (days.has(d)) { n++; d--; }
  return n;
}
