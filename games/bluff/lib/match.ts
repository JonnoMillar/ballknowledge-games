import type { Named, Side, Slot } from './types';

/**
 * A match of Bluff, as the phone on the table keeps it.
 *
 * Each round one player bluffs and the next guesses. The bluffer sees a real
 * XI and swaps one player for anyone; the phone is covered and passed; the
 * guesser taps the one they think is fake. A wrong tap costs the guesser a
 * life and they go again, up to MAX_LOSSES_PER_ROUND wrong taps, then the
 * reveal. Out of lives, out of the match. Last one with lives wins.
 *
 * Pure: the page asks the server for a side and feeds it in here.
 */

/** Lives each player starts with. Jonno tunes these after playtesting. */
export const LIVES = 3;
/** Wrong taps a guesser can make in one round before the reveal. */
export const MAX_LOSSES_PER_ROUND = 2;

export interface Options {
  from: number;
  to: number;
  /** "Help the faker": a few plausible fakes for each part of the pitch (HELP_COUNT). */
  help: boolean;
}

export interface Player { name: string; lives: number }

/** Where on the team sheet: line, then place in the line. */
export type At = readonly [line: number, place: number];

export type Phase = 'deal' | 'plant' | 'cover' | 'guess' | 'reveal';

export interface Round {
  no: number;
  bluffer: number;
  guesser: number;
  side: Side | null;
  plant: { at: At; fake: Named } | null;
  /** The real players the guesser tapped. */
  wrong: At[];
  caught: boolean;
}

export interface Match {
  players: Player[];
  options: Options;
  phase: Phase;
  round: Round;
  /** Side keys dealt this match and the ones before, so a side doesn't come round again soon. */
  seen: string[];
  /** Set once one player has lives left: the reveal is full time. */
  winner: number | null;
}

const alive = (m: Match, i: number) => m.players[i]!.lives > 0;

/** The next player after `i` who still has lives. */
function after(m: Match, i: number): number {
  for (let k = 1; k <= m.players.length; k++) {
    const j = (i + k) % m.players.length;
    if (alive(m, j)) return j;
  }
  return i;
}

const freshRound = (no: number, bluffer: number, guesser: number): Round => ({ no, bluffer, guesser, side: null, plant: null, wrong: [], caught: false });

export function newMatch(names: string[], options: Options, seen: string[] = []): Match {
  return {
    players: names.map((name) => ({ name, lives: LIVES })),
    options,
    phase: 'deal',
    round: freshRound(1, 0, 1),
    seen,
    winner: null,
  };
}

export function dealt(m: Match, side: Side): Match {
  if (m.phase !== 'deal') return m;
  return { ...m, phase: 'plant', round: { ...m.round, side }, seen: [...m.seen, side.key].slice(-200) };
}

export const sameAt = (a: At, b: At) => a[0] === b[0] && a[1] === b[1];
export const slotAt = (side: Side, at: At): Slot | undefined => side.lines[at[0]]?.[at[1]];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** A fake can't be someone already on the sheet. */
export function canPlant(side: Side, fake: Named): boolean {
  return !side.lines.flat().some((s) => s.id === fake.id || fold(s.name) === fold(fake.name));
}

export function planted(m: Match, at: At, fake: Named): Match {
  const side = m.round.side;
  if (m.phase !== 'plant' || !side || !slotAt(side, at) || !canPlant(side, fake)) return m;
  return { ...m, phase: 'cover', round: { ...m.round, plant: { at, fake } } };
}

export const uncovered = (m: Match): Match => (m.phase === 'cover' ? { ...m, phase: 'guess' } : m);

/** The guesser taps a slot. Right ends the round; wrong costs a life and, at the limit, ends it too. */
export function guessed(m: Match, at: At): Match {
  const { round } = m;
  if (m.phase !== 'guess' || !round.plant || round.wrong.some((w) => sameAt(w, at))) return m;
  if (sameAt(at, round.plant.at)) return reveal({ ...m, round: { ...round, caught: true } });
  const players = m.players.map((p, i) => (i === round.guesser ? { ...p, lives: p.lives - 1 } : p));
  const next = { ...m, players, round: { ...round, wrong: [...round.wrong, at] } };
  const out = players[round.guesser]!.lives === 0 || next.round.wrong.length >= MAX_LOSSES_PER_ROUND;
  return out ? reveal(next) : next;
}

function reveal(m: Match): Match {
  const left = m.players.flatMap((p, i) => (p.lives > 0 ? [i] : []));
  return { ...m, phase: 'reveal', winner: left.length === 1 ? left[0]! : null };
}

/** Roles move on: this round's guesser bluffs next (or the next one standing), and the one after guesses. */
export function nextRound(m: Match): Match {
  if (m.phase !== 'reveal' || m.winner !== null) return m;
  const { round } = m;
  const bluffer = alive(m, round.guesser) ? round.guesser : after(m, round.guesser);
  return { ...m, phase: 'deal', round: freshRound(round.no + 1, bluffer, after(m, bluffer)) };
}

export const rematch = (m: Match): Match => newMatch(m.players.map((p) => p.name), m.options, m.seen);

/** The sheet as the guesser sees it: the fake in its slot. */
export function sheet(side: Side, plant: Round['plant']): Slot[][] {
  if (!plant) return side.lines;
  return side.lines.map((line, l) => line.map((s, k) => (sameAt([l, k], plant.at) ? { id: plant.fake.id, name: plant.fake.name, pos: s.pos } : s)));
}

/** The four places on the pitch the faker's help is given for. */
export type Group = 'GK' | 'DEF' | 'MID' | 'FWD';
export const GROUPS: readonly Group[] = ['GK', 'DEF', 'MID', 'FWD'];
/** Suggestions per group, once a round: a keeper is too easy to guess with more. Jonno tunes these. */
export const HELP_COUNT: Record<Group, number> = { GK: 1, DEF: 2, MID: 2, FWD: 2 };

/** Which group a slot is in, by its line: keeper, back line, front line, anything between is midfield. */
export function groupAt(side: Side, at: At): Group {
  const last = side.lines.length - 1;
  return at[0] === 0 ? 'GK' : at[0] === 1 ? 'DEF' : at[0] === last ? 'FWD' : 'MID';
}

/**
 * Help the faker: the round's suggested fakes, drawn once so every slot in a
 * group gets the same ones. Picked from each group's best few, never someone
 * in the XI, and nobody twice.
 */
export function helpSet(side: Side, rand: () => number = Math.random): Record<Group, Named[]> {
  const used = new Set<string>();
  const out = { GK: [], DEF: [], MID: [], FWD: [] } as Record<Group, Named[]>;
  for (const g of GROUPS) {
    const n = HELP_COUNT[g];
    const best = (side.help[g] ?? []).filter((p) => canPlant(side, p) && !used.has(p.id)).slice(0, n * 2);
    for (let i = best.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [best[i], best[j]] = [best[j]!, best[i]!];
    }
    out[g] = best.slice(0, n);
    for (const p of out[g]) used.add(p.id);
  }
  return out;
}
