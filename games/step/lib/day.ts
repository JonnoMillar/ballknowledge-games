import { STEPS, endsOf, fieldOf, stepsOf, CHECKABLE, type Givens, type Views } from './rules';
import type { Player } from '../../../src/lib/chemistry/types';

/**
 * The daily: which givens a day gets, chosen by rule and kept in a committed
 * schedule (games/step/data/days.json) that the step-days cron tops up.
 *
 * A schedule, not a pure function of the date: reuse rules read history, and
 * a day once played stays the day it was even if the pool or the rules move.
 */
export interface StoredDay extends Givens { date: string }

/** Day 1: the day Chain's daily launched, as Spoofed counts, so the archive starts full. */
export const EPOCH = '2026-09-19';
/** The cron tops the schedule up to TOP_UP days ahead whenever fewer than MIN_AHEAD remain. */
export const MIN_AHEAD = 14;
export const TOP_UP = 28;

/**
 * What makes a step (a given player and a club) good enough for the daily.
 * Measured 2026-10-14: 1,643 steps pass over 102 givens and 35 clubs, median
 * field 37. Same given and club rules as Deep Cuts (scripts/build-deep-cuts.ts).
 */
export const RULES = {
  /** Givens a British fan places at once (sitelink fame)... */
  givenFame: 70,
  /** ...who played in the Premier League, are British, or are this famous everywhere. */
  givenIcon: 90,
  givenMinClubs: 2,
  givenMaxClubs: 6,
  /** The club: one of the biggest this many in the pool, in a followed league. */
  clubPool: 60,
  /** Wide enough to dig... */
  minField: 25,
  /** ...with enough checkable names to make a deep answer something you can know... */
  minCheckable: 12,
  /** ...and an obvious way in: the most famous answer is a name people hold. */
  minEntry: 60,
  /** A given player is not back within this many days, a club within clubGap, a step (given and club) within stepGap. */
  givenGap: 14,
  clubGap: 7,
  stepGap: 120,
} as const;

/** Top-flight leagues the audience follows, as in scripts/build-deep-cuts.ts. */
const FOLLOWED_LEAGUES = new Set([
  'Q9448', 'Q19510', 'Q19565', 'Q15804', 'Q324867', 'Q82595', 'Q13394',
  'Q167541', 'Q182994', 'Q14377162', 'Q485568',
]);
/** The Premier League: every day has a club from it, and a given needs a spell in it unless British or an icon. */
const PREMIER_LEAGUE = 'Q9448';
/** England, Scotland, Wales, Northern Ireland, the United Kingdom. */
const BRITISH = new Set(['Q21', 'Q22', 'Q25', 'Q26', 'Q145']);
/** Managers whose playing careers are not what anyone knows them for. */
const NOT_A_GIVEN = new Set(['Q4462', 'Q207431']); // Joachim Löw, Louis van Gaal

export interface World {
  byId: Map<string, Player>;
  byClub: Map<string, Player[]>;
  /** Per given, the clubs that make a good step with them. */
  good: Map<string, Set<string>>;
  /** Per club, the givens it makes a good step with. */
  givensAt: Map<string, string[]>;
  /** Each good step's answers, by stepKey. */
  fields: Map<string, Set<string>>;
  /** Each good step's obvious and deepest answers, the two shown once it is played, by stepKey. */
  shown: Map<string, string[]>;
  /** The clubs in the pool whose league is the Premier League. */
  english: Set<string>;
  /** English Wikipedia views, the grading ruler's fame. */
  views: Views;
}

const stepKey = (player: string, club: string) => `${player}|${club}`;

export function buildWorld(pool: readonly Player[], views: Views): World {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const byClub = new Map<string, Player[]>();
  const votes = new Map<string, Map<string, number>>();
  for (const p of pool) p.clubIds.forEach((c, i) => {
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p);
    const l = p.leagueIds[i];
    if (!l) return;
    if (!votes.has(c)) votes.set(c, new Map());
    votes.get(c)!.set(l, (votes.get(c)!.get(l) ?? 0) + 1);
  });
  const league = (c: string) => [...(votes.get(c) ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0];
  const clubs = [...byClub.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, RULES.clubPool)
    .map(([id]) => id)
    .filter((id) => FOLLOWED_LEAGUES.has(league(id) ?? ''));
  const givens = pool.filter((p) => p.fame.value >= RULES.givenFame && !NOT_A_GIVEN.has(p.id)
    && p.clubIds.length >= RULES.givenMinClubs && p.clubIds.length <= RULES.givenMaxClubs
    && (p.leagueIds.includes(PREMIER_LEAGUE) || BRITISH.has(p.nation) || p.fame.value >= RULES.givenIcon));

  const world: World = {
    byId, byClub, good: new Map(), givensAt: new Map(), fields: new Map(), shown: new Map(),
    english: new Set(clubs.filter((c) => league(c) === PREMIER_LEAGUE)),
    views,
  };
  for (const g of givens) for (const c of clubs) {
    if (!isGood(world, g, c)) continue;
    const field = fieldOf(g, byClub.get(c)!);
    const { obvious, elite } = endsOf(g, c, field, views);
    world.fields.set(stepKey(g.id, c), new Set(field.map((p) => p.id)));
    world.shown.set(stepKey(g.id, c), [obvious!.id, elite!.id]);
    if (!world.good.has(g.id)) world.good.set(g.id, new Set());
    world.good.get(g.id)!.add(c);
    if (!world.givensAt.has(c)) world.givensAt.set(c, []);
    world.givensAt.get(c)!.push(g.id);
  }
  return world;
}

/**
 * The step's own promises. The club is not in the given's career, or every
 * player at the club would fit; and the field is wide, deep and has a way in.
 */
export function isGood(world: Pick<World, 'byClub'>, given: Player, club: string): boolean {
  if (given.clubIds.includes(club)) return false;
  const field = fieldOf(given, world.byClub.get(club) ?? []);
  return field.length >= RULES.minField
    && field.filter((p) => p.fame.value >= CHECKABLE).length >= RULES.minCheckable
    && field.some((p) => p.fame.value >= RULES.minEntry);
}

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const daysBetween = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / 86400000);
export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86400000).toISOString().slice(0, 10);

/** FNV-1a seed, then a xorshift-style generator: the same day on every machine. */
function seeded(seed: string): () => number {
  let s = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) s = Math.imul(s ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  s ||= 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) ^ 0x297a2d39) >>> 0; return s / 4294967296; };
}
const shuffle = <T>(xs: readonly T[], rand: () => number): T[] => {
  const a = [...xs].sort();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};

/** What the history rules out on `date`: givens, clubs and steps still cooling. */
function cooling(history: readonly StoredDay[], date: string) {
  const players = new Set<string>();
  const clubs = new Set<string>();
  const steps = new Set<string>();
  for (const d of history) {
    const ago = daysBetween(d.date, date);
    if (ago < RULES.givenGap) d.players.forEach((p) => players.add(p));
    if (ago < RULES.clubGap) d.clubs.forEach((c) => clubs.add(c));
    if (ago < RULES.stepGap) for (const s of stepsOf(d)) steps.add(stepKey(s.player, s.club));
  }
  return { players, clubs, steps };
}

/**
 * What keeps a day's steps apart, for a sequence P1 C1 P2 … built so far;
 * null when nothing clashes. Two givens either side of a club played for
 * none of the same clubs, so each step makes you think of different teams;
 * the answers a step shows once played (the obvious and the deepest) answer
 * no other step that day, so showing them gives nothing away; and a full day
 * has a Premier League club.
 *
 * Steps may still share an answer otherwise: no two answer pools apart is
 * almost never possible (82 of 23,709 club-sharing pairs, 2026-10-14).
 */
export function clash(world: Pick<World, 'byId' | 'fields' | 'shown' | 'english'>, seq: readonly string[]): string | null {
  for (let i = 2; i < seq.length; i += 2) {
    const a = world.byId.get(seq[i - 2]!)!;
    const b = world.byId.get(seq[i]!)!;
    if (a.clubIds.some((c) => b.clubIds.includes(c))) return `${a.id} and ${b.id} share a club`;
  }
  const keys = seq.slice(1).map((_, k) => (k % 2 === 0 ? stepKey(seq[k]!, seq[k + 1]!) : stepKey(seq[k + 1]!, seq[k]!)));
  for (const [k, key] of keys.entries()) for (const [j, other] of keys.entries()) {
    if (j === k) continue;
    const id = (world.shown.get(key) ?? []).find((x) => world.fields.get(other)?.has(x));
    if (id) return `${id}, shown after step ${k + 1}, answers step ${j + 1}`;
  }
  if (seq.length === STEPS + 1 && !seq.some((x, i) => i % 2 === 1 && world.english.has(x))) return 'no Premier League club';
  return null;
}

/**
 * One day: P1 C1 P2 C2 P3, every adjacent pair a good, unused step, nobody
 * and no club twice, nothing still cooling, nothing clashing. A seeded
 * depth-first search, so the same history and date always give the same day.
 */
export function composeDay(world: World, history: readonly StoredDay[], date: string): StoredDay {
  const rand = seeded(`step:${date}`);
  const cool = cooling(history, date);
  const seq: string[] = [];
  const used = new Set<string>();

  const grow = (): boolean => {
    if (seq.length === STEPS + 1) return true;
    const last = seq[seq.length - 1];
    const wantPlayer = seq.length % 2 === 0;
    const options = last === undefined
      ? [...world.good.keys()]
      : wantPlayer ? world.givensAt.get(last) ?? [] : [...(world.good.get(last) ?? [])];
    for (const next of shuffle(options, rand)) {
      if (used.has(next) || (wantPlayer ? cool.players : cool.clubs).has(next)) continue;
      if (last !== undefined && cool.steps.has(wantPlayer ? stepKey(next, last) : stepKey(last, next))) continue;
      seq.push(next); used.add(next);
      if (clash(world, seq) === null && grow()) return true;
      seq.pop(); used.delete(next);
    }
    return false;
  };
  if (!grow()) throw new Error(`no day can be built for ${date} under the reuse rules`);
  return {
    date,
    players: seq.filter((_, i) => i % 2 === 0),
    clubs: seq.filter((_, i) => i % 2 === 1),
  };
}

/** The schedule from `start` (or the day after the last one) up to `upTo`, inclusive. */
export function extend(world: World, days: readonly StoredDay[], start: string, upTo: string): StoredDay[] {
  const out = [...days];
  for (let next = out.length ? addDays(out[out.length - 1]!.date, 1) : start; next <= upTo; next = addDays(next, 1)) {
    out.push(composeDay(world, out, next));
  }
  return out;
}

/** Every promise a day makes, as a list of what it breaks. Empty is good. */
export function problems(world: World, day: StoredDay, history: readonly StoredDay[]): string[] {
  const out: string[] = [];
  const cool = cooling(history, day.date);
  if (day.players.length !== Math.ceil((STEPS + 1) / 2) || day.clubs.length !== Math.floor((STEPS + 1) / 2)) out.push(`${day.date}: wrong shape`);
  if (new Set(day.players).size !== day.players.length) out.push(`${day.date}: a given twice`);
  if (new Set(day.clubs).size !== day.clubs.length) out.push(`${day.date}: a club twice`);
  for (const p of day.players) if (cool.players.has(p)) out.push(`${day.date}: ${p} back within ${RULES.givenGap} days`);
  for (const c of day.clubs) if (cool.clubs.has(c)) out.push(`${day.date}: ${c} back within ${RULES.clubGap} days`);
  for (const s of stepsOf(day)) {
    const given = world.byId.get(s.player);
    if (!given || !isGood(world, given, s.club)) out.push(`${day.date}: ${s.player} with ${s.club} is not a good step`);
    if (cool.steps.has(stepKey(s.player, s.club))) out.push(`${day.date}: ${s.player} with ${s.club} used before`);
  }
  const seq = day.players.flatMap((p, i) => (day.clubs[i] ? [p, day.clubs[i]!] : [p]));
  const c = out.length ? null : clash(world, seq);
  if (c) out.push(`${day.date}: ${c}`);
  return out;
}
