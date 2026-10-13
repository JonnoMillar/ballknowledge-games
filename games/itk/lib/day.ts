import { fakeOptions, KINDS, type Fake, type Kind } from './fakes';
import type { Career, World } from './world';

/**
 * One day of ITK: five careers, easy to hard, each with one fake.
 *
 * The schedule is history: who appeared when, and which fakes they carried.
 * A day is composed from it, so reuse rules are reads, not recomputation.
 */
export interface StoredStop { club: string; year: number; loan: boolean }
export interface StoredRound {
  player: string;
  name: string;
  mode: 'swap' | 'insert';
  kind: Kind;
  stops: StoredStop[];
  /** Index of the fake in `stops`. */
  fake: number;
  /** The club a swapped fake covered. */
  real?: string;
}
/** `floor`: the reuse gap this day was built to, so a later change in the pool does not rewrite the rule for it. */
export interface StoredDay { date: string; floor: number; rounds: StoredRound[] }

/** Day 1, Spoofed #1: the day Chain's daily launched, so the two count days alike and the archive starts full. */
export const EPOCH = '2026-09-19';
/** The cron tops the schedule up to TOP_UP days ahead whenever fewer than MIN_AHEAD remain. */
export const MIN_AHEAD = 14;
export const TOP_UP = 28;
export const ROUNDS = 5;
/** Fame bands, top to bottom: the share of the pool each holds, and how many careers a day takes from it. */
export const BANDS = [{ share: 0.2, take: 1 }, { share: 0.4, take: 2 }, { share: 0.4, take: 2 }] as const;
/** A club is not the fake again within this many days. */
export const FAKE_COOLDOWN = 7;
export const JOURNEYMAN = 7;
const SHORT = 5;
const SHORT_INSERT = 0.6;

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const daysBetween = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / 86400000);

/** FNV-1a: a string to a 32-bit seed. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
export function seeded(seed: string): () => number {
  let s = hash(seed) || 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) ^ 0x297a2d39) >>> 0; return s / 4294967296; };
}
const shuffle = <T>(a: readonly T[], rand: () => number): T[] => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [x[i], x[j]] = [x[j]!, x[i]!]; }
  return x;
};

/** The eligible pool split into fame bands, most viewed first. */
export function bands(eligible: readonly Career[]): Career[][] {
  const ranked = [...eligible].sort((a, b) => b.views - a.views || a.id.localeCompare(b.id));
  const out: Career[][] = [];
  let at = 0;
  BANDS.forEach((b, i) => {
    const end = i === BANDS.length - 1 ? ranked.length : at + Math.round(ranked.length * b.share);
    out.push(ranked.slice(at, end));
    at = end;
  });
  return out;
}

/** Each band comes round in about pool ÷ 5 days; never sooner than 80% of that. */
export const gapFloor = (pool: number) => Math.floor((0.8 * pool) / ROUNDS);

/** Easy to hard: fame first, then how hidden the fake is. */
export function difficulty(c: Career, f: Fake): number {
  return -Math.log10(c.views) + (f.mode === 'insert' ? 0.35 : 0) + (f.kind === 'loan' || f.kind === 'return' ? 0.25 : 0)
    + (c.stops.length >= JOURNEYMAN ? 0.15 : 0) + (f.both ? 0.2 : 0);
}

export function toRound(c: Career, f: Fake): StoredRound {
  const stops: StoredStop[] = c.stops.map((s) => ({ club: s.q, year: s.from, loan: s.loan }));
  const fake = { club: f.club, year: f.year, loan: f.loan };
  if (f.mode === 'swap') stops[f.index] = fake; else stops.splice(f.index, 0, fake);
  return { player: c.id, name: c.name, mode: f.mode, kind: f.kind, stops, fake: f.index, ...(f.real ? { real: f.real } : {}) };
}

/** The fake club of a stored round. */
export const fakeClub = (r: StoredRound) => r.stops[r.fake]!.club;

/**
 * Compose the day after `history`. Throws when the pool cannot fill it: the
 * cron fails loudly with two weeks of days still in hand.
 */
export function composeDay(w: World, history: readonly StoredDay[], date: string): StoredDay {
  const rand = seeded(`itk:${date}`);
  const pool = w.eligible;
  const floor = gapFloor(pool.length);
  const lastSeen = new Map<string, string>(), pastFakes = new Map<string, Set<string>>(), recent = new Set<string>();
  for (const d of history) for (const r of d.rounds) {
    lastSeen.set(r.player, d.date);
    (pastFakes.get(r.player) ?? pastFakes.set(r.player, new Set()).get(r.player)!).add(fakeClub(r));
    if (daysBetween(d.date, date) <= FAKE_COOLDOWN) recent.add(fakeClub(r));
  }
  const rested = (c: Career) => { const l = lastSeen.get(c.id); return !l || daysBetween(l, date) >= floor; };
  /** Longest unseen first, never seen before anyone; ties in the day's own order. */
  const queue = (band: readonly Career[]) => band.filter(rested).sort((a, b) =>
    (lastSeen.get(a.id) ?? '').localeCompare(lastSeen.get(b.id) ?? '') || hash(date + a.id) - hash(date + b.id));

  type Pick = { c: Career; f: Fake };
  const chosen: Pick[] = [];
  const kinds = new Set<Kind>();
  const dayFakes = () => new Set(chosen.map((p) => p.f.club));
  const excludeFor = (c: Career, also: ReadonlySet<string> = new Set()) =>
    new Set([...(pastFakes.get(c.id) ?? []), ...recent, ...also]);

  /** Five different kinds where possible; the last resort lets a kind repeat rather than lose the day. */
  let strict = true;
  const take = (c: Career): Pick | null => {
    if (chosen.some((p) => p.c.id === c.id)) return null;
    const opts = fakeOptions(w, c, excludeFor(c, dayFakes()), rand);
    // A short career gets an insert more often than not, never always: a fixed rule is a tell.
    const order = c.stops.length <= SHORT && rand() < SHORT_INSERT
      ? ['insert' as Kind, ...shuffle(KINDS.filter((k) => k !== 'insert'), rand)]
      : shuffle(KINDS, rand);
    for (const k of order) {
      if (strict && kinds.has(k)) continue;
      const f = opts.get(k);
      if (f) return { c, f };
    }
    return null;
  };
  const add = (p: Pick) => { chosen.push(p); kinds.add(p.f.kind); };

  const banded = bands(pool);
  banded.forEach((band, i) => {
    let got = 0;
    for (const c of queue(band)) {
      if (got >= BANDS[i]!.take) break;
      const p = take(c);
      if (p) { add(p); got++; }
    }
  });
  // A band that could not fill its share: the nearest band down (then up) makes it up, and only then may a kind repeat.
  const spare = [...banded.slice(1), banded[0]!].flatMap((b) => queue(b));
  for (const pass of [true, false]) {
    strict = pass;
    for (const c of spare) {
      if (chosen.length >= ROUNDS) break;
      const p = take(c);
      if (p) add(p);
    }
  }
  strict = true;
  if (chosen.length < ROUNDS) throw new Error(`ITK ${date}: only ${chosen.length} of ${ROUNDS} careers fit`);

  // A journeyman somewhere: swap the last bottom-band pick for one from the same band.
  if (!chosen.some((p) => p.c.stops.length >= JOURNEYMAN)) {
    const dropped = chosen.pop()!;
    kinds.delete(dropped.f.kind);
    const j = queue(banded[banded.length - 1]!).filter((c) => c.stops.length >= JOURNEYMAN && c.id !== dropped.c.id);
    let found = false;
    for (const c of j) { const p = take(c); if (p) { add(p); found = true; break; } }
    if (!found) add(dropped);
  }

  // At least one insert: turn the hardest pick that can carry one into an insert.
  if (!kinds.has('insert')) {
    for (const p of [...chosen].reverse()) {
      const others = new Set(chosen.filter((x) => x !== p).map((x) => x.f.club));
      const f = fakeOptions(w, p.c, excludeFor(p.c, others), rand).get('insert');
      if (f) { kinds.delete(p.f.kind); p.f = f; kinds.add('insert'); break; }
    }
  }

  chosen.sort((a, b) => difficulty(a.c, a.f) - difficulty(b.c, b.f));
  return { date, floor, rounds: chosen.map((p) => toRound(p.c, p.f)) };
}

/** Extend the schedule so it runs `upTo` dates, one day after another from `start`. */
export function extend(w: World, days: readonly StoredDay[], start: string, upTo: string): StoredDay[] {
  const out = [...days];
  let next = out.length ? addDays(out[out.length - 1]!.date, 1) : start;
  while (next <= upTo) {
    out.push(composeDay(w, out, next));
    next = addDays(next, 1);
  }
  return out;
}

export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86400000).toISOString().slice(0, 10);
