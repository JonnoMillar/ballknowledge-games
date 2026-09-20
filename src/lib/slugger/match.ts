import type { Bases } from './grade';
import type { PitchKind } from './deck';

/**
 * SLUGGER — the match, as a pure value.
 *
 * Everything the phone knows about the game is here, and every rule of
 * baseball the game keeps is a function from one Match to the next. The
 * server judges a swing (did they play there, how deep a cut) and this
 * applies the count, the bases, the innings and the end. Nothing here reads
 * the pool. See docs/superpowers/specs/2026-09-20-slugger-design.md.
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
  | { verdict: 'hit'; player: Named; bases: Bases; apps: number | null; club: ClubRef }
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
    }
  | {
      kind: 'strike';
      reason: 'miss' | 'clock' | 'nothing';
      /** The club that was pitched. */
      club: ClubRef | null;
      /** The name, and the clubs it did play for, on a miss. */
      player?: Named;
      clubs?: readonly ClubRef[];
      /** Strike three. */
      out: boolean;
      /** The third out: the side is retired. */
      sideRetired: boolean;
    }
  | {
      kind: 'foul';
      player: Named;
      /** A foul counts as a strike, unless the batter already had two. */
      counted: boolean;
    };

export type Half = 'top' | 'bottom';

export interface Match {
  status: 'live' | 'over';
  settings: Settings;
  /** [0] is away and bats the top; [1] is home and bats the bottom. */
  sides: readonly [Side, Side];
  inning: number;
  half: Half;
  strikes: number;
  outs: number;
  /** First, second, third. */
  bases: readonly [Named | null, Named | null, Named | null];
  /** Per side, the lineup index due up. */
  due: readonly [number, number];
  /** Per side, runs per inning. Grows with extras. */
  runs: readonly [readonly number[], readonly number[]];
  hits: readonly [number, number];
  strikeouts: readonly [number, number];
  /** Players who have had a hit this match. Named again, they're a foul. */
  used: readonly string[];
  /** Clubs thrown this match, so the deal avoids repeats. */
  pitched: readonly string[];
  /** The kind of the last pitch in this at-bat, which cannot be thrown again next. */
  lastKind: PitchKind | null;
  /** The pitcher's hand, once dealt. */
  hand: readonly Pitch[] | null;
  /** The pitch at the plate. */
  pitch: Pitch | null;
  /** The last ruling, shown until Next. */
  call: Call | null;
  winner: 0 | 1 | null;
}

export type SideIndex = 0 | 1;

export const MAX_LINEUP = 4;
export const STRIKES_PER_OUT = 3;
export const OUTS_PER_HALF = 3;

export const batting = (m: Match): SideIndex => (m.half === 'top' ? 0 : 1);
export const fielding = (m: Match): SideIndex => (m.half === 'top' ? 1 : 0);

export function batter(m: Match): { side: SideIndex; name: string } {
  const side = batting(m);
  const lineup = m.sides[side].lineup;
  return { side, name: lineup[m.due[side] % lineup.length] ?? m.sides[side].name };
}

export const total = (m: Match, side: SideIndex): number => m.runs[side].reduce((a, b) => a + b, 0);

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
    strikes: 0,
    outs: 0,
    bases: [null, null, null],
    due: [0, 0],
    runs: [Array(innings).fill(0), Array(innings).fill(0)],
    hits: [0, 0],
    strikeouts: [0, 0],
    used: [],
    pitched: [],
    lastKind: null,
    hand: null,
    pitch: null,
    call: null,
    winner: null,
  };
}

/** The deal arrives from the server: three clubs, one per kind. */
export function dealt(m: Match, hand: readonly Pitch[]): Match {
  return { ...m, hand };
}

/** The pitcher's choice. The kind just thrown in this at-bat is not allowed. */
export function pitched(m: Match, pitch: Pitch): Match {
  if (m.lastKind === pitch.kind) return m;
  return { ...m, hand: null, pitch, pitched: [...m.pitched, pitch.id] };
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

/** Advance every runner and the batter by `bases`; count who crossed home. */
function advance(m: Match, hitter: Named, bases: Bases): { m: Match; runs: number } {
  const slots: (Named | null)[] = [...m.bases];
  let runs = 0;
  const next: (Named | null)[] = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const r = slots[i];
    if (!r) continue;
    const to = i + bases;
    if (to >= 3) runs++;
    else next[to] = r;
  }
  if (bases >= 4) runs++;
  else next[bases - 1] = hitter;
  return { m: { ...m, bases: next as [Named | null, Named | null, Named | null] }, runs };
}

const nextBatter = (m: Match): Match => {
  const side = batting(m);
  const due: [number, number] = [...m.due] as [number, number];
  due[side] = (due[side] + 1) % m.sides[side].lineup.length;
  return { ...m, due, strikes: 0, lastKind: null, pitch: null, hand: null };
};

/**
 * Three outs: change sides. Runners are stranded, the count clears.
 *
 * The end of the game lives here. After the bottom of the last inning (or
 * any later one) with a leader, it's over. After the top of the last inning
 * with the home side ahead, the home side does not bat — as in baseball,
 * there is nothing to bat for.
 */
function retireSide(m: Match): Match {
  let out: Match = { ...m, bases: [null, null, null], outs: 0, strikes: 0, lastKind: null, pitch: null, hand: null };
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

/** A hit: runners move, runs count, the batter's done, the name is burnt. */
function hit(m: Match, v: Extract<Verdict, { verdict: 'hit' }>): Match {
  const side = batting(m);
  const loaded = m.bases.every(Boolean);
  const moved = advance(m, v.player, v.bases);
  let out = withRuns(moved.m, side, moved.runs);
  const hits: [number, number] = [...out.hits] as [number, number];
  hits[side]++;
  out = { ...out, hits, used: [...out.used, v.player.id] };
  const ended = walkOff(out);
  out = nextBatter(out);
  if (ended) out = { ...out, status: 'over', winner: 1 };
  out.call = {
    kind: 'hit', player: v.player, bases: v.bases, apps: v.apps, club: v.club,
    runs: moved.runs, grandSlam: loaded && v.bases === 4, walkOff: ended,
  };
  return out;
}

/** A strike, from a miss, the clock, or nothing. Three is an out; the third out retires the side. */
export function strike(m: Match, reason: 'miss' | 'clock' | 'nothing', player?: Named, clubs?: readonly ClubRef[]): Match {
  if (m.status !== 'live') return m;
  const side = batting(m);
  const kind = m.pitch?.kind ?? null;
  const club: ClubRef | null = m.pitch ? { id: m.pitch.id, name: m.pitch.name, crest: m.pitch.crest } : null;
  let out: Match = { ...m, strikes: m.strikes + 1, pitch: null, hand: null, lastKind: kind };
  const isOut = out.strikes >= STRIKES_PER_OUT;
  let sideRetired = false;
  if (isOut) {
    const strikeouts: [number, number] = [...out.strikeouts] as [number, number];
    strikeouts[side]++;
    out = nextBatter({ ...out, strikeouts, outs: out.outs + 1 });
    if (out.outs >= OUTS_PER_HALF) {
      sideRetired = true;
      out = retireSide(out);
    }
  }
  out.call = { kind: 'strike', reason, club, player, clubs, out: isOut, sideRetired };
  return out;
}

/**
 * A swing at the pitch at the plate.
 *
 * A name already burnt is a foul before it is anything else: it never
 * reaches the umpire. A foul is a strike unless the count is already two,
 * in which case nothing changes and the batter swings again.
 */
export function swung(m: Match, v: Verdict): Match {
  if (m.status !== 'live' || !m.pitch) return m;
  if (m.used.includes(v.player.id)) {
    const counted = m.strikes < STRIKES_PER_OUT - 1;
    const call: Call = { kind: 'foul', player: v.player, counted };
    if (counted) return { ...strike(m, 'miss'), call };
    // The count stands, but the pitcher throws again.
    return { ...m, pitch: null, hand: null, lastKind: m.pitch.kind, call };
  }
  if (v.verdict === 'miss') return strike(m, 'miss', v.player, v.clubs);
  return hit(m, v);
}

/** Next: clear the call. The state under it already moved on. */
export function next(m: Match): Match {
  return { ...m, call: null };
}

/** The same sides, the other way round, and a fresh board. */
export function rematch(m: Match): Match {
  return newMatch(m.settings, [m.sides[1], m.sides[0]]);
}

/** A scoreline in words: "Home 4, Away 2" or "Tied". */
export function scoreline(m: Match): string {
  const a = total(m, 0);
  const b = total(m, 1);
  if (a === b) return `${a}–${b}`;
  return a > b ? `${m.sides[0].name} ${a}–${b}` : `${m.sides[1].name} ${b}–${a}`;
}
