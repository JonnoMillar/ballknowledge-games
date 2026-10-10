import type { Spot } from './pitch';
import { packScore } from './score';
import type { Answer } from './types';

/**
 * What the player has done, kept in the browser. No accounts: a throw is
 * written when the answer comes back, and the first throw at a goal is the
 * one that counts. A refresh resumes from here. Keyed by pack id.
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

export type Status =
  | { state: 'unplayed' }
  | { state: 'part'; thrown: number }
  | { state: 'done'; distances: number[] };

/** Where this browser is with a pack of n goals. A save of another length (the pack changed) counts as unplayed. */
export function packStatus(play: PinPlay | undefined, n: number): Status {
  if (!play || play.throws.length !== n) return { state: 'unplayed' };
  const thrown = play.throws.filter((t): t is Throw => !!t);
  if (thrown.length === n) return { state: 'done', distances: thrown.map((t) => t.answer.distance) };
  return thrown.length ? { state: 'part', thrown: thrown.length } : { state: 'unplayed' };
}

/** The next pack in library order this browser has not finished, starting after the current one and wrapping. Null when all are done. */
export function nextPack(order: readonly { id: string; size: number }[], store: Store, current: string): string | null {
  const i = order.findIndex((p) => p.id === current);
  const rest = [...order.slice(i + 1), ...order.slice(0, Math.max(i, 0))];
  return rest.find((p) => packStatus(store[p.id], p.size).state !== 'done')?.id ?? null;
}

export interface PlayRecord { packs: number; average: number | null; best: number | null; scores: Map<string, number> }

/** This browser's finished packs: how many, the mean pack score (rounded), the best, and each score. */
export function record(store: Store, cards: readonly { id: string; size: number }[]): PlayRecord {
  const scores = new Map<string, number>();
  for (const c of cards) {
    const s = packStatus(store[c.id], c.size);
    if (s.state === 'done') scores.set(c.id, packScore(s.distances));
  }
  const all = [...scores.values()];
  return {
    packs: all.length,
    average: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null,
    best: all.length ? Math.max(...all) : null,
    scores,
  };
}

/** Where a score sits among this browser's finished packs: 1 is the best (a tie shares the place). */
export function standing(scores: Iterable<number>, mine: number): number {
  return [...scores].filter((s) => s > mine).length + 1;
}

/** The pack to put at the top of the hub: the first started and unfinished in library order, else the first unstarted. */
export function suggest(order: readonly { id: string; size: number }[], store: Store): { id: string; state: 'part' | 'fresh' } | null {
  const st = order.map((p) => ({ id: p.id, s: packStatus(store[p.id], p.size).state }));
  const part = st.find((p) => p.s === 'part');
  if (part) return { id: part.id, state: 'part' };
  const fresh = st.find((p) => p.s === 'unplayed');
  return fresh ? { id: fresh.id, state: 'fresh' } : null;
}
