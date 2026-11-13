import { apart, categoriesFor, fair, SIZE, trueOrder, type Finale, type Values } from './rules';

/**
 * The daily: which five players line up and through which club, chosen by
 * rule and kept in a committed schedule (games/tunnel/data/days.json) that
 * the tunnel-days cron tops up. A schedule, not a pure function of the date:
 * the reuse rules read history, and a day once played keeps its numbers even
 * after the careers are refreshed.
 */

/** Day 1, as Chain, Spoofed and Steps count, so the archive starts full. */
export const EPOCH = '2026-09-19';
/** The cron tops the schedule up to TOP_UP days ahead whenever fewer than MIN_AHEAD remain. */
export const MIN_AHEAD = 14;
export const TOP_UP = 28;

export const RULES = {
  /** Every player a name a British fan knows: en-wiki views over two years. */
  minViews: 300_000,
  /** At the day's club, a player who played there has at least this many league games for it. */
  minApps: 10,
  /**
   * A club needs this many such players to host a day: big, followed clubs
   * whose numbers a fan has a feel for (15 keeps ~80 clubs, Rangers and
   * Brentford in, Las Palmas and Lorient out; measured 2026-10-15).
   */
  clubSize: 15,
  /** Mixed, not a team photo: the five are born across at least this many years. */
  minEraSpan: 10,
  /** One day in this many, all five played for the club (a club theme); otherwise four did. */
  themeEvery: 5,
  /** A player is not back within this many days, a club within clubGap. */
  playerGap: 30,
  clubGap: 7,
} as const;

/** Reserve, B and youth sides: part of the club, not a club of their own. */
export const RESERVE = /\s(B|C|II|III)$|\b(U-?\d+|Sub-?\d+|Reserves?|Youth|Academy|Primavera|Juvenil|Juniors?|Castilla|Atl[eè]tic|Mestalla|Jong|Amateure|Promesas)\b|Sevilla Atl[eé]tico|Bilbao Athletic/i;

export interface Stint { q?: string; title: string; apps?: number; goals?: number; loan: boolean }
export interface Facts { born?: string; cm?: number; views?: number }
export interface Inputs {
  pool: readonly { id: string; name: string }[];
  careers: Readonly<Record<string, { stints: readonly Stint[] }>>;
  facts: Readonly<Record<string, Facts>>;
  finales?: readonly FinalePool[];
}
export interface FinalePool { finale: Finale; values: Readonly<Record<string, number>>; followers?: Readonly<Record<string, number>> }

export interface Lined {
  id: string;
  name: string;
  /** Days since 1970. */
  born: number;
  cm: number;
  goals: number;
  clubs: number;
  /** League games per club QID, first team only. */
  apps: Map<string, number>;
}

export interface StoredDay {
  date: string;
  club: string;
  /** In the order they walk out (the starting line), not any category's order. */
  players: string[];
  /** Per category, one number per player in `players` order (see rules.ts Values). */
  values: Values;
  finale?: Finale;
}

export interface World { byId: Map<string, Lined>; clubs: Map<string, string[]>; finales?: readonly FinalePool[] }

/** Distinct senior clubs a player turned out for: loans count, reserve sides and spells with no games do not. */
export function clubCount(stints: readonly Stint[]): number {
  return new Set(stints.filter((s) => s.apps !== 0 && !RESERVE.test(s.title)).map((s) => s.q ?? s.title)).size;
}

export function buildWorld({ pool, careers, facts, finales }: Inputs): World {
  const byId = new Map<string, Lined>();
  for (const p of pool) {
    const f = facts[p.id];
    const stints = careers[p.id]?.stints;
    if (!f?.born || !f.cm || (f.views ?? 0) < RULES.minViews || !stints?.length) continue;
    // A career with a spell of unknown length cannot be counted.
    if (stints.some((s) => s.apps === undefined || s.goals === undefined)) continue;
    const apps = new Map<string, number>();
    for (const s of stints) if (s.q && !RESERVE.test(s.title)) apps.set(s.q, (apps.get(s.q) ?? 0) + s.apps!);
    byId.set(p.id, {
      id: p.id,
      name: p.name,
      born: Math.round(Date.parse(`${f.born}T00:00:00Z`) / 86400000),
      cm: f.cm,
      goals: stints.reduce((n, s) => n + s.goals!, 0),
      clubs: clubCount(stints),
      apps,
    });
  }
  const clubs = new Map<string, string[]>();
  for (const p of byId.values()) for (const [c, n] of p.apps) if (n >= RULES.minApps) {
    if (!clubs.has(c)) clubs.set(c, []);
    clubs.get(c)!.push(p.id);
  }
  for (const [c, ids] of clubs) if (ids.length < RULES.clubSize) clubs.delete(c); else ids.sort();
  return { byId, clubs, finales };
}

export function valuesOf(world: World, club: string, ids: readonly string[], pool?: FinalePool): Values {
  const ps = ids.map((id) => world.byId.get(id)!);
  const values: Values = {
    age: ps.map((p) => -p.born),
    height: ps.map((p) => p.cm),
    apps: ps.map((p) => p.apps.get(club) ?? 0),
    goals: ps.map((p) => p.goals),
    clubs: ps.map((p) => p.clubs),
  };
  if (pool) {
    values[pool.finale.kind === 'both' ? 'rating' : pool.finale.kind] = ids.map((id) => pool.values[id] ?? NaN);
    if (pool.finale.kind === 'both') values.followers = ids.map((id) => pool.followers?.[id] ?? NaN);
  }
  return values;
}

/**
 * Why a line-up cannot be a day, or null. Every category fair; every
 * category's line apart from every other (see closeLines), so each
 * category reorders the five afresh; at least four played for the club;
 * born across eras.
 */
export function flaw(world: World, club: string, ids: readonly string[], pool?: FinalePool): string | null {
  if (ids.length !== SIZE || new Set(ids).size !== SIZE) return 'not five players';
  const v = valuesOf(world, club, ids, pool);
  if (v.apps.filter((n) => n >= RULES.minApps).length < SIZE - 1) return 'fewer than four played for the club';
  if (v.apps.some((n) => n > 0 && n < RULES.minApps)) return 'a token spell at the club';
  const years = ids.map((id) => world.byId.get(id)!.born / 365.25);
  if (Math.max(...years) - Math.min(...years) < RULES.minEraSpan) return 'all one era';
  const categories = categoriesFor(pool?.finale);
  for (const c of categories) if (!v[c] || !fair(c, v[c]!)) return `${c} is not fair`;
  const close = closeLines(categories.map((c) => trueOrder(v[c]!)));
  return close ? `${categories[close[0]]} too close to ${categories[close[1]]}` : null;
}

/**
 * The order the five walk out in, as indexes into `ids`: far from the first
 * category's line (it is the line the player starts from) and more than a
 * swap from every other. Null when no order is.
 */
export function walkOut(values: Values, rand: () => number, finale?: Finale): number[] | null {
  const lines = categoriesFor(finale).map((c) => trueOrder(values[c]!));
  const perms: number[][] = [];
  const grow = (p: number[]) => {
    if (p.length === SIZE) perms.push(p);
    else for (let i = 0; i < SIZE; i++) if (!p.includes(i)) grow([...p, i]);
  };
  grow([]);
  return shuffle(perms, rand).find((p) => closeLines([p, ...lines]) === null) ?? null;
}

/**
 * The first pair of lines (walk-out, then each category's true line) that are
 * not apart, or null. Every pair, not only neighbours: two categories that
 * agree anywhere in the day would make one of them a repeat.
 */
export function closeLines(lines: readonly (readonly number[])[]): [number, number] | null {
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) if (!apart(lines[i]!, lines[j]!, j === i + 1)) return [i, j];
  return null;
}

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const daysBetween = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / 86400000);
export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86400000).toISOString().slice(0, 10);

/** FNV-1a seed, then a xorshift-style generator: the same day on every machine. */
export function seeded(seed: string): () => number {
  let s = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) s = Math.imul(s ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  s ||= 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) ^ 0x297a2d39) >>> 0; return s / 4294967296; };
}
const shuffle = <T>(xs: readonly T[], rand: () => number): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};

/** Tries per club before moving to the next: a random draw, not a search, keeps the line-ups varied. */
const TRIES = 2000;

/** One day: a club not cooling, four (or five) of its players and an outsider, none cooling, with no flaw. */
export function composeDay(world: World, history: readonly StoredDay[], date: string): StoredDay {
  if (world.finales?.length) {
    const pools = [...world.finales];
    const start = daysBetween(EPOCH, date) % pools.length;
    for (let i = 0; i < pools.length; i++) {
      const day = composeFor(world, history, date, pools[(start + i) % pools.length]);
      if (day) return day;
    }
    throw new Error(`no rotating line-up can be built for ${date} under the reuse rules`);
  }
  const day = composeFor(world, history, date);
  if (!day) throw new Error(`no line-up can be built for ${date} under the reuse rules`);
  return day;
}

function composeFor(world: World, history: readonly StoredDay[], date: string, pool?: FinalePool): StoredDay | null {
  const rand = seeded(`tunnel:${date}`);
  const coolPlayers = new Set<string>();
  const coolClubs = new Set<string>();
  for (const d of history) {
    const ago = daysBetween(d.date, date);
    if (ago < RULES.playerGap) d.players.forEach((p) => coolPlayers.add(p));
    if (ago < RULES.clubGap) coolClubs.add(d.club);
  }
  const theme = rand() < 1 / RULES.themeEvery;
  const everyone = [...world.byId.keys()].sort().filter((id) => !coolPlayers.has(id) && (!pool || (Number.isFinite(pool.values[id]) && (pool.finale.kind !== 'both' || Number.isFinite(pool.followers?.[id])))));
  const available = new Set(everyone);
  // Bigger clubs come up more often (a weighted shuffle: key rand^(1/size)), smaller ones still do.
  const order = [...world.clubs.keys()].sort()
    .map((c) => [c, rand() ** (1 / world.clubs.get(c)!.length)] as const)
    .sort((a, b) => b[1] - a[1]).map(([c]) => c);
  for (const club of order) {
    if (coolClubs.has(club)) continue;
    const members = world.clubs.get(club)!.filter((id) => available.has(id));
    const outsiders = everyone.filter((id) => !world.byId.get(id)!.apps.has(club));
    if (members.length < (theme ? SIZE : SIZE - 1) || (!theme && !outsiders.length)) continue;
    for (let t = 0; t < TRIES; t++) {
      const ids = shuffle(members, rand).slice(0, theme ? SIZE : SIZE - 1);
      if (!theme) ids.splice(Math.floor(rand() * SIZE), 0, outsiders[Math.floor(rand() * outsiders.length)]!);
      if (flaw(world, club, ids, pool)) continue;
      const order = walkOut(valuesOf(world, club, ids, pool), rand, pool?.finale);
      if (!order) continue;
      const players = order.map((i) => ids[i]!);
      return { date, club, players, values: valuesOf(world, club, players, pool), ...(pool ? { finale: pool.finale } : {}) };
    }
  }
  return null;
}

/** The schedule from `start` (or the day after the last one) up to `upTo`, inclusive. */
export function extend(world: World, days: readonly StoredDay[], start: string, upTo: string): StoredDay[] {
  const out = [...days];
  for (let next = out.length ? addDays(out[out.length - 1]!.date, 1) : start; next <= upTo; next = addDays(next, 1)) {
    out.push(composeDay(world, out, next));
  }
  return out;
}

/** Every promise a stored day makes, judged on its own frozen values plus the reuse rules. Empty is good. */
export function problems(day: StoredDay, history: readonly StoredDay[]): string[] {
  const out: string[] = [];
  const v = day.values;
  if (day.players.length !== SIZE || new Set(day.players).size !== SIZE) out.push(`${day.date}: not five players`);
  if (v.apps.filter((n) => n >= RULES.minApps).length < SIZE - 1) out.push(`${day.date}: fewer than four at the club`);
  const categories = categoriesFor(day.finale);
  for (const c of categories) if (v[c]?.length !== SIZE || !fair(c, v[c]!)) out.push(`${day.date}: ${c} not fair`);
  if (out.length) return out;
  const lines = [day.players.map((_, i) => i), ...categories.map((c) => trueOrder(v[c]!))];
  const close = closeLines(lines);
  if (close) out.push(`${day.date}: lines ${close[0]} and ${close[1]} too close`);
  for (const d of history) {
    const ago = daysBetween(d.date, day.date);
    if (ago <= 0) continue;
    if (ago < RULES.playerGap) for (const p of day.players) if (d.players.includes(p)) out.push(`${day.date}: ${p} back within ${RULES.playerGap} days`);
    if (ago < RULES.clubGap && d.club === day.club) out.push(`${day.date}: ${day.club} back within ${RULES.clubGap} days`);
  }
  return out;
}
