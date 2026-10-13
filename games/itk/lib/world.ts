import type { Player } from '../../../src/lib/chemistry/types';

/**
 * Everything the generator knows about the pool, worked out once from the
 * committed data files. Pure: the script and the tests pass the files in.
 *
 * The rules are v5's (the prototype picker, `scripts/itk/pick-examples.mjs`
 * in git history), and the reasons for each are in games/itk/HANDOFF.md.
 */

export interface Stint { q?: string; title?: string; from: number; to: number; loan?: boolean; apps?: number | null }
export interface CareerRecord { title: string; stints?: Stint[] }
export interface ClubInfo { name: string; crestUrl?: string }
export interface PortraitInfo { source: 'cutout' | 'commons' | 'none'; year?: number; alt?: { year: number } | null }

/** One stop on a trail, as the generator sees it. `ret` is a loan return. */
export interface Stop { q: string; from: number; loan: boolean; apps: number; ret: boolean }

export interface Inputs {
  pool: readonly Player[];
  careers: Record<string, CareerRecord | undefined>;
  clubs: Record<string, ClubInfo | undefined>;
  /** enwiki views over 24 months by page title, and the redirects that resolve titles to pages. */
  views: Record<string, number>;
  redirects: Record<string, string>;
  /** Wikidata P17 countries per club. */
  countries: Record<string, string[] | undefined>;
  portraits: Record<string, PortraitInfo | undefined>;
}

/** The numbers. A playtest changes these, not the code. */
export const RULES = {
  playerMin: 500_000,
  /** Above this a career is too easy (four players). */
  playerMax: 5_000_000,
  clubKnown: 300_000,
  plShare: 0.3,
  clubHuge: 2_000_000,
  /** UK, Spain, Germany, Italy, France, Monaco, Netherlands, Portugal (Wikidata P17, checked 2026-10-12). */
  countries: ['Q145', 'Q29', 'Q183', 'Q38', 'Q142', 'Q235', 'Q55', 'Q45'],
  unknownStops: 1,
  minStops: 4,
  maxStops: 9,
  firstStop: 2000,
  medianStop: 2008,
  lastStop: 2015,
  giants: 25,
  /** A club this famous is a spell fans remember: never swapped, never either side of a fake. */
  marquee: 8_000_000,
  bigSpell: 50,
  clubSize: 8,
  eraStarters: 4,
} as const;

const PL = 'Q9448';
export const RESERVE = /\s(B|C|II|III)$|\b(U-?\d+|Sub-?\d+|Reserves?|Youth|Academy|Primavera|Juvenil|Juniors?|Castilla|Atl[eè]tic|Mestalla|Jong|Amateure|Promesas)\b|Sevilla Atl[eé]tico|Bilbao Athletic/i;

/** A loan sits inside its parent spell; show the parent, and show the return when the parent runs on past it. */
export function buildTrail(stints: readonly Stint[], isReserve: (q: string) => boolean): Stop[] {
  const all = stints.filter((s): s is Stint & { q: string } => !!s.q && !RESERVE.test(s.title ?? '') && !isReserve(s.q));
  const isParent = (s: Stint) => all.some((t) => t.loan && t.q !== s.q && t.from >= s.from && t.from <= s.to);
  const raw = all.filter((s) => (s.apps ?? 0) > 0 || (!s.loan && isParent(s)));
  const seq: (Stint & { q: string; ret?: boolean })[] = [];
  let parent: (Stint & { q: string }) | null = null;
  raw.forEach((s, i) => {
    seq.push(s);
    if (!s.loan) { parent = s; return; }
    const next = raw[i + 1];
    const p = parent as (Stint & { q: string }) | null;
    if (p && p.to > s.to && !(next && next.from <= s.to && next.loan)) seq.push({ ...p, from: s.to, loan: false, apps: 0, ret: true });
  });
  const out: Stop[] = [];
  for (const s of seq) {
    const last = out[out.length - 1];
    if (last && last.q === s.q) { last.apps += s.apps ?? 0; last.loan = last.loan && !!s.loan; continue; }
    out.push({ q: s.q, from: s.from, loan: !!s.loan, apps: s.apps ?? 0, ret: !!s.ret });
  }
  return out;
}

export const median = (a: readonly number[]): number => {
  const b = [...a].sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)]!;
};

export interface Career { id: string; name: string; views: number; stops: Stop[]; photoYear: number | null; player: Player }

export interface World {
  clubs: Inputs['clubs'];
  clubViews: (q: string) => number;
  known: (q: string) => boolean;
  isReserve: (q: string) => boolean;
  giants: ReadonlySet<string>;
  /** Moves between clubs in the pool: out.get(a).get(b) players went from a to b. */
  out: Map<string, Map<string, number>>;
  inn: Map<string, Map<string, number>>;
  /** Pool players who played for the club. */
  size: Map<string, number>;
  /** The median fame of a club's players in a five-year window, or null with fewer than three. */
  strength: (q: string, year: number) => number | null;
  /** At least four pool players joined within two years: the club was a real destination then. */
  activeAt: (q: string, year: number) => boolean;
  /** Every club the player was ever registered with. */
  owned: (id: string) => Set<string>;
  /** Passes every rule except the portrait: what fetch-portraits resolves. */
  candidates: Career[];
  /** Candidates with a resolved portrait. The generator's pool. */
  eligible: Career[];
}

/** The year of the photo production shows; null for no photo; undefined when unresolved. */
export function photoYearOf(p: PortraitInfo | undefined): number | null | undefined {
  if (!p) return undefined;
  if (p.source === 'commons') return p.year ?? null;
  if (p.source === 'cutout') return p.alt?.year ?? null;
  return null;
}

export function buildWorld(inp: Inputs): World {
  const { pool, careers, clubs } = inp;
  const views = (t: string | undefined) => (t ? inp.views[inp.redirects[t] ?? t] : undefined);
  const name = (q: string) => clubs[q]?.name ?? q;
  const isReserve = (q: string) => RESERVE.test(name(q));

  const cv = new Map<string, number>();
  for (const c of Object.values(careers)) for (const s of c?.stints ?? []) {
    const v = views(s.title);
    if (s.q && v != null) cv.set(s.q, Math.max(cv.get(s.q) ?? 0, v));
  }
  const clubViews = (q: string) => cv.get(q) ?? 0;
  const giants = new Set([...cv].sort((a, b) => b[1] - a[1]).slice(0, RULES.giants).map(([q]) => q));

  const plN = new Map<string, number>(), totN = new Map<string, number>();
  for (const p of pool) {
    const isPL = p.leagueIds.includes(PL);
    for (const c of new Set(p.clubIds)) { totN.set(c, (totN.get(c) ?? 0) + 1); if (isPL) plN.set(c, (plN.get(c) ?? 0) + 1); }
  }
  const countries = new Set<string>(RULES.countries);
  /** Known to a British fan: a well-read club in a league he follows, or English-linked, or simply huge. */
  const known = (q: string) => {
    const v = clubViews(q);
    if (v >= RULES.clubHuge) return true;
    if (v < RULES.clubKnown) return false;
    return (inp.countries[q] ?? []).some((c) => countries.has(c)) || (plN.get(q) ?? 0) / (totN.get(q) ?? 1) >= RULES.plShare;
  };

  const out = new Map<string, Map<string, number>>(), inn = new Map<string, Map<string, number>>();
  const size = new Map<string, number>(), era = new Map<string, number[]>(), starts = new Map<string, number[]>();
  const inc = (m: Map<string, Map<string, number>>, a: string, b: string) => {
    if (!m.has(a)) m.set(a, new Map());
    m.get(a)!.set(b, (m.get(a)!.get(b) ?? 0) + 1);
  };
  for (const p of pool) {
    const all = careers[p.id]?.stints ?? [];
    for (const s of all) if (s.q && (s.apps ?? 0) > 0) (starts.get(s.q) ?? starts.set(s.q, []).get(s.q)!).push(s.from);
    const st = all.filter((s): s is Stint & { q: string } => !!s.q && !isReserve(s.q) && (s.apps ?? 0) > 0);
    for (let i = 0; i < st.length - 1; i++) if (st[i]!.q !== st[i + 1]!.q) { inc(out, st[i]!.q, st[i + 1]!.q); inc(inn, st[i + 1]!.q, st[i]!.q); }
    for (const q of new Set(st.map((s) => s.q))) size.set(q, (size.get(q) ?? 0) + 1);
    for (const s of st) { const k = `${s.q}@${Math.floor(s.from / 5)}`; (era.get(k) ?? era.set(k, []).get(k)!).push(p.fame.value); }
  }
  const strength = (q: string, y: number) => { const a = era.get(`${q}@${Math.floor(y / 5)}`); return a && a.length >= 3 ? median(a) : null; };
  const activeAt = (q: string, y: number) => (starts.get(q) ?? []).filter((x) => Math.abs(x - y) <= 2).length >= RULES.eraStarters;
  const byId = new Map(pool.map((p) => [p.id, p]));
  const owned = (id: string) => new Set([...(byId.get(id)?.clubIds ?? []), ...(careers[id]?.stints ?? []).flatMap((s) => (s.q ? [s.q] : []))]);

  const candidates: Career[] = [];
  for (const p of pool) {
    const c = careers[p.id];
    const v = views(c?.title) ?? 0;
    if (!c || v < RULES.playerMin || v >= RULES.playerMax) continue;
    const stops = buildTrail(c.stints ?? [], isReserve);
    if (stops.length < RULES.minStops || stops.length > RULES.maxStops || stops.some((s) => !clubs[s.q]?.crestUrl)) continue;
    const yrs = stops.map((s) => s.from).sort((a, b) => a - b);
    if (yrs[0]! < RULES.firstStop || yrs[yrs.length >> 1]! < RULES.medianStop || yrs[yrs.length - 1]! < RULES.lastStop) continue;
    if (stops.filter((s) => !known(s.q)).length > RULES.unknownStops) continue;
    const all = new Set((c.stints ?? []).map((s) => s.q));
    // A pool club the career cannot explain means the career is incomplete.
    if (p.clubIds.some((x) => !all.has(x) && !isReserve(x))) continue;
    // The name fans use (the enwiki title), not the Wikidata label: Marc Guiu, not Marc Guiu Paz.
    candidates.push({ id: p.id, name: c.title.replace(/\s*\(.*\)$/, ''), views: v, stops, photoYear: null, player: p });
  }
  const eligible: Career[] = [];
  for (const c of candidates) {
    const y = photoYearOf(inp.portraits[c.id]);
    if (y !== undefined) eligible.push({ ...c, photoYear: y });
  }
  return { clubs, clubViews, known, isReserve, giants, out, inn, size, strength, activeAt, owned, candidates, eligible };
}
