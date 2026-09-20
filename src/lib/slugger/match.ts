import { BASES_FOR, type Bases } from './grade';
import { KNUCKLEBALLS_PER_GAME, type PitchKind } from './deck';

/**
 * SLUGGER — the match, as a pure value.
 *
 * Everything the phone knows about the game is here, and every rule of
 * baseball the game keeps is a function from one Match to the next. The
 * server rules on a swing (did they play there); this applies the bases,
 * the runs, the innings and the end. Nothing here reads the pool. See
 * docs/superpowers/specs/2026-09-20-slugger-design.md.
 *
 * The shape, after the first draft played too long:
 *
 * - Every batter gets ONE swing: a hit or an out. No count.
 * - Three batters a half, hit or out, then sides change. Runners left on
 *   base are stranded. A half is three names and a minute.
 * - A hit is worth what the pitch was worth: fastball single, curveball
 *   double, slider triple, knuckleball home run.
 * - A runner on second or third comes home on any hit. Without this, three
 *   singles never score and the safe pitch costs nothing; with it, three
 *   fastballs concede exactly one run, and every off-speed pitch is a
 *   gamble to stop it.
 * - Three knuckleballs a side per game, so the small club is a card you
 *   spend, not a setting you leave on.
 */

export interface Side {
  name: string;
  /** Batters in order. One is a solo player; up to four is two-a-side. */
  lineup: readonly string[];
}

export interface Settings {
  innings: number;
  /** Seconds on the shot clock, or 0 for none. */
  clock: number;
}

/** A club as the browser sees it. */
export interface ClubRef { id: string; name: string; crest: boolean }

/** A pitch: a club, and what kind of pitch it is. */
export interface Pitch extends ClubRef { kind: PitchKind }

export interface Named { id: string; name: string }

/** The server's ruling on a name against a club. */
export type Verdict =
  | { verdict: 'hit'; player: Named; apps: number | null; club: ClubRef }
  | { verdict: 'miss'; player: Named; clubs: readonly ClubRef[] };

/** What the umpire says after a swing, for the call card. */
export type Call =
  | {
      kind: 'hit';
      player: Named;
      bases: Bases;
      apps: number | null;
      club: ClubRef;
      /** Runs that came in on this hit. */
      runs: number;
      /** Bases loaded and a home run: four runs. */
      grandSlam: boolean;
      walkOff: boolean;
      sideRetired: boolean;
    }
  | {
      kind: 'out';
      reason: 'miss' | 'clock' | 'nothing';
      /** The club that was pitched. */
      club: ClubRef | null;
      /** The name, and the clubs it did play for, on a miss. */
      player?: Named;
      clubs?: readonly ClubRef[];
      /** The third batter: the side is retired. */
      sideRetired: boolean;
    };

export type Half = 'top' | 'bottom';

export interface Match {
  status: 'live' | 'over';
  settings: Settings;
  /** [0] is away and bats the top; [1] is home and bats the bottom. */
  sides: readonly [Side, Side];
  inning: number;
  half: Half;
  /** Batters retired or on base this half, 0..2. The third ends it. */
  up: number;
  /** First, second, third. */
  bases: readonly [Named | null, Named | null, Named | null];
  /** Per side, the lineup index due up. */
  due: readonly [number, number];
  /** Per side, runs per inning. Grows with extras. */
  runs: readonly [readonly number[], readonly number[]];
  hits: readonly [number, number];
  outs: readonly [number, number];
  /** Per side, knuckleballs left to throw. */
  knuckleballs: readonly [number, number];
  /** Players who have had a hit this match. Named again, they're a foul. */
  used: readonly string[];
  /** Clubs thrown this match, so the deal avoids repeats. */
  pitched: readonly string[];
  /** The pitcher's hand, once dealt. */
  hand: readonly Pitch[] | null;
  /** The pitch at the plate. */
  pitch: Pitch | null;
  /** A name already used, swung at just now: swing again. */
  foul: Named | null;
  /** The last ruling, shown until Next. */
  call: Call | null;
  winner: 0 | 1 | null;
}

export type SideIndex = 0 | 1;

export const MAX_LINEUP = 4;
export const BATTERS_PER_HALF = 3;

export const batting = (m: Match): SideIndex => (m.half === 'top' ? 0 : 1);
export const fielding = (m: Match): SideIndex => (m.half === 'top' ? 1 : 0);

export function batter(m: Match): { side: SideIndex; name: string } {
  const side = batting(m);
  const lineup = m.sides[side].lineup;
  return { side, name: lineup[m.due[side] % lineup.length] ?? m.sides[side].name };
}

export const total = (m: Match, side: SideIndex): number => m.runs[side].reduce((a, b) => a + b, 0);

/** Whether the fielding side may throw this kind now. */
export const canThrow = (m: Match, kind: PitchKind): boolean =>
  kind !== 'knuckleball' || m.knuckleballs[fielding(m)] > 0;

/** Which panel the page shows. */
export type Phase = 'over' | 'call' | 'deal' | 'pitch' | 'swing';

export function phase(m: Match): Phase {
  if (m.call) return 'call';
  if (m.status === 'over') return 'over';
  if (m.pitch) return 'swing';
  if (m.hand) return 'pitch';
  return 'deal';
}

export function newMatch(settings: Settings, sides: readonly [Side, Side]): Match {
  const clean = (s: Side): Side => ({
    name: s.name.trim() || 'Side',
    lineup: s.lineup.map((n) => n.trim()).filter(Boolean).slice(0, MAX_LINEUP),
  });
  const a = clean(sides[0]);
  const b = clean(sides[1]);
  const innings = Math.max(1, Math.floor(settings.innings));
  return {
    status: 'live',
    settings: { innings, clock: Math.max(0, settings.clock) },
    sides: [a.lineup.length ? a : { ...a, lineup: [a.name] }, b.lineup.length ? b : { ...b, lineup: [b.name] }],
    inning: 1,
    half: 'top',
    up: 0,
    bases: [null, null, null],
    due: [0, 0],
    runs: [Array(innings).fill(0), Array(innings).fill(0)],
    hits: [0, 0],
    outs: [0, 0],
    knuckleballs: [KNUCKLEBALLS_PER_GAME, KNUCKLEBALLS_PER_GAME],
    used: [],
    pitched: [],
    hand: null,
    pitch: null,
    foul: null,
    call: null,
    winner: null,
  };
}

/** The deal arrives from the server: one club of each kind. */
export function dealt(m: Match, hand: readonly Pitch[]): Match {
  return { ...m, hand };
}

/** The pitcher's choice. A knuckleball is spent from the side's three. */
export function pitched(m: Match, pitch: Pitch): Match {
  if (!canThrow(m, pitch.kind)) return m;
  let knuckleballs = m.knuckleballs;
  if (pitch.kind === 'knuckleball') {
    const k: [number, number] = [...m.knuckleballs] as [number, number];
    k[fielding(m)]--;
    knuckleballs = k;
  }
  return { ...m, hand: null, pitch, foul: null, knuckleballs, pitched: [...m.pitched, pitch.id] };
}

const withRuns = (m: Match, side: SideIndex, n: number): Match => {
  const runs = m.runs.map((r) => [...r]) as [number[], number[]];
  while (runs[side].length < m.inning) { runs[0].push(0); runs[1].push(0); }
  runs[side][m.inning - 1] = (runs[side][m.inning - 1] ?? 0) + n;
  return { ...m, runs };
};

/** Bottom of the last inning or later, and the home side is now ahead: it's over. */
const walkOff = (m: Match): boolean =>
  m.half === 'bottom' && m.inning >= m.settings.innings && total(m, 1) > total(m, 0);

/**
 * Move the runners. Everyone advances by the hit; anyone on second or
 * third comes home on any hit at all. The batter takes the base the hit
 * is worth, or rounds them all.
 */
function advance(m: Match, hitter: Named, bases: Bases): { m: Match; runs: number } {
  let runs = 0;
  const next: (Named | null)[] = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const r = m.bases[i];
    if (!r) continue;
    const to = i >= 1 ? 3 : i + bases;
    if (to >= 3) runs++;
    else next[to] = r;
  }
  if (bases >= 4) runs++;
  else next[bases - 1] = hitter;
  return { m: { ...m, bases: next as [Named | null, Named | null, Named | null] }, runs };
}

/** The batter is done, one way or the other. */
const nextBatter = (m: Match): Match => {
  const side = batting(m);
  const due: [number, number] = [...m.due] as [number, number];
  due[side] = (due[side] + 1) % m.sides[side].lineup.length;
  return { ...m, due, up: m.up + 1, pitch: null, hand: null, foul: null };
};

/**
 * Three batters: change sides. Runners are stranded.
 *
 * The end of the game lives here. After the bottom of the last inning (or
 * any later one) with a leader, it's over. After the top of the last inning
 * with the home side ahead, the home side does not bat — as in baseball,
 * there is nothing to bat for.
 */
function retireSide(m: Match): Match {
  let out: Match = { ...m, bases: [null, null, null], up: 0, pitch: null, hand: null, foul: null };
  const last = out.inning >= out.settings.innings;
  if (out.half === 'top') {
    if (last && total(out, 1) > total(out, 0)) return { ...out, status: 'over', winner: 1 };
    return { ...out, half: 'bottom' };
  }
  if (last && total(out, 0) !== total(out, 1)) {
    return { ...out, status: 'over', winner: total(out, 0) > total(out, 1) ? 0 : 1 };
  }
  out = { ...out, half: 'top', inning: out.inning + 1 };
  if (out.runs[0].length < out.inning) {
    out = { ...out, runs: [[...out.runs[0], 0], [...out.runs[1], 0]] };
  }
  return out;
}

/** After a batter: the third of the half retires the side. */
function afterBatter(m: Match): { m: Match; sideRetired: boolean } {
  const moved = nextBatter(m);
  if (moved.up >= BATTERS_PER_HALF) return { m: retireSide(moved), sideRetired: true };
  return { m: moved, sideRetired: false };
}

/** A hit: worth the pitch. Runners move, runs count, the name is burnt. */
function hit(m: Match, v: Extract<Verdict, { verdict: 'hit' }>, kind: PitchKind): Match {
  const side = batting(m);
  const bases = BASES_FOR[kind];
  const loaded = m.bases.every(Boolean);
  const moved = advance(m, v.player, bases);
  let out = withRuns(moved.m, side, moved.runs);
  const hits: [number, number] = [...out.hits] as [number, number];
  hits[side]++;
  out = { ...out, hits, used: [...out.used, v.player.id] };
  const ended = walkOff(out);
  const after = afterBatter(out);
  out = after.m;
  if (ended) out = { ...out, status: 'over', winner: 1 };
  out.call = {
    kind: 'hit', player: v.player, bases, apps: v.apps, club: v.club,
    runs: moved.runs, grandSlam: loaded && bases === 4, walkOff: ended, sideRetired: after.sideRetired && !ended,
  };
  return out;
}

/** An out, from a miss, the clock, or nothing. The third batter retires the side. */
export function out(m: Match, reason: 'miss' | 'clock' | 'nothing', player?: Named, clubs?: readonly ClubRef[]): Match {
  if (m.status !== 'live') return m;
  const side = batting(m);
  const club: ClubRef | null = m.pitch ? { id: m.pitch.id, name: m.pitch.name, crest: m.pitch.crest } : null;
  const outs: [number, number] = [...m.outs] as [number, number];
  outs[side]++;
  const after = afterBatter({ ...m, outs });
  const next = after.m;
  next.call = { kind: 'out', reason, club, player, clubs, sideRetired: after.sideRetired };
  return next;
}

/**
 * A swing at the pitch at the plate.
 *
 * A name already burnt is a foul before it is anything else: it never
 * reaches the umpire, and the batter swings again at the same pitch.
 */
export function swung(m: Match, v: Verdict): Match {
  if (m.status !== 'live' || !m.pitch) return m;
  if (m.used.includes(v.player.id)) return { ...m, foul: v.player };
  if (v.verdict === 'miss') return out(m, 'miss', v.player, v.clubs);
  return hit(m, v, m.pitch.kind);
}

/** Next: clear the call. The state under it already moved on. */
export function next(m: Match): Match {
  return { ...m, call: null };
}

/** The same sides, the other way round, and a fresh board. */
export function rematch(m: Match): Match {
  return newMatch(m.settings, [m.sides[1], m.sides[0]]);
}
