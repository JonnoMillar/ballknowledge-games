import type { ClubView } from '../../../src/lib/clubs';
import type { PortraitImage } from '../../../src/lib/portraits';
import type { LossReason } from './rules';

/**
 * A match of Rondo, as the phone on the table keeps it.
 *
 * Two to four players pass the phone. A ball is dealt, passed until
 * somebody loses it, and the loser takes a bib. Three bibs and you are in
 * the middle — out of the rotation. One left standing is the match. The
 * loser of a ball makes the first pass of the next, like kicking off after
 * conceding.
 *
 * Pure: the page calls the server for the deal and the verdict and feeds
 * the answers in here.
 */

export const BIBS_OUT = 3;
export const CLOCKS = [30, 20, 0] as const;
export type Clock = (typeof CLOCKS)[number];

export interface Side {
  name: string;
  bibs: number;
}

/** A player as a sticker: name, the ground they stand on, a picture if there is one. */
export interface Carrier {
  id: string;
  name: string;
  ground: string;
  image?: PortraitImage;
}

/** One touch of the ball: who had it, and the clubs the pass to them went through. */
export interface Touch extends Carrier {
  via: string[];
}

export interface Loss {
  /** Index of the player who lost it. */
  by: number;
  reason: LossReason;
  /** The carrier's open clubs at the moment of the loss: the reveal. */
  open: string[];
  /** On a dead end, the clubs the fatal pass went through. */
  via?: string[];
  /** On a dead end or a wrong pass, who was named. */
  target?: Carrier;
  /** Who was on the ball. */
  carrier: Carrier;
}

export interface Match {
  players: Side[];
  clock: Clock;
  ballNo: number;
  /** Whose pass it is. */
  turn: number;
  carrier: Carrier | null;
  burnt: string[];
  named: string[];
  trail: Touch[];
  clubs: Record<string, ClubView>;
  loss: Loss | null;
  over: boolean;
  /** Starters dealt so far, so a match does not repeat one. */
  starters: string[];
}

export function newMatch(names: readonly string[], clock: Clock): Match {
  return {
    players: names.map((name) => ({ name: name.trim() || 'Player', bibs: 0 })),
    clock, ballNo: 0, turn: 0, carrier: null, burnt: [], named: [], trail: [], clubs: {},
    loss: null, over: false, starters: [],
  };
}

export const alive = (m: Match): number[] => m.players.flatMap((p, i) => (p.bibs < BIBS_OUT ? [i] : []));

/** The next player still standing after `i`, or `i` itself if nobody else is. */
export function nextAlive(m: Match, i: number): number {
  const n = m.players.length;
  for (let k = 1; k <= n; k++) {
    const j = (i + k) % n;
    if (m.players[j]!.bibs < BIBS_OUT) return j;
  }
  return i;
}

export function dealt(m: Match, starter: Carrier): Match {
  return {
    ...m,
    ballNo: m.ballNo + 1,
    carrier: starter,
    burnt: [],
    named: [starter.id],
    trail: [{ ...starter, via: [] }],
    loss: null,
    starters: [...m.starters, starter.id],
  };
}

export function passed(m: Match, target: Carrier, via: string[], burnt: string[], clubs: Record<string, ClubView>): Match {
  return {
    ...m,
    carrier: target,
    burnt,
    named: [...m.named, target.id],
    trail: [...m.trail, { ...target, via }],
    clubs: { ...m.clubs, ...clubs },
    turn: nextAlive(m, m.turn),
  };
}

export function lost(
  m: Match,
  loss: Omit<Loss, 'by' | 'carrier'>,
  clubs: Record<string, ClubView>,
): Match {
  if (!m.carrier) return m;
  const by = m.turn;
  const players = m.players.map((p, i) => (i === by ? { ...p, bibs: p.bibs + 1 } : p));
  const next: Match = {
    ...m,
    players,
    clubs: { ...m.clubs, ...clubs },
    loss: { ...loss, by, carrier: m.carrier },
  };
  const standing = alive(next);
  next.over = standing.length <= 1;
  // The loser kicks off the next ball, unless they are now in the middle.
  next.turn = players[by]!.bibs < BIBS_OUT ? by : nextAlive(next, by);
  return next;
}

/** Clear the ball so the page can deal the next one. */
export function nextBall(m: Match): Match {
  return { ...m, carrier: null, burnt: [], named: [], trail: [], loss: null };
}

/** Same players, same clock, fresh bibs. Starters already dealt stay excluded. */
export function rematch(m: Match): Match {
  return {
    ...m,
    players: m.players.map((p) => ({ ...p, bibs: 0 })),
    ballNo: 0, turn: 0, carrier: null, burnt: [], named: [], trail: [], loss: null, over: false,
  };
}

/** The winner's index once the match is over, or null. */
export function winner(m: Match): number | null {
  if (!m.over) return null;
  const standing = alive(m);
  if (standing.length === 1) return standing[0]!;
  // Everybody out at once cannot happen (one bib per loss), but be safe: fewest bibs.
  let best = 0;
  m.players.forEach((p, i) => { if (p.bibs < m.players[best]!.bibs) best = i; });
  return best;
}
