import { linkColour, meetsRequirement, sharedClubs } from '../chemistry/link';
import { slotObscurityScore } from '../fame/obscurity';
import { factFame } from '../fame/spell';
import type { Side } from '../fame/spell';
import type { LinkColour, Player } from '../chemistry/types';
import type { ChainFill, ChainMode, SlotClue } from './types';

/** Link i joins slot i and slot i+1. Null colour while either end is empty. */
export interface ChainLink {
  index: number;
  colour: LinkColour | null;
  /**
   * Clubs both players appeared for. Empty when either end is empty, and
   * often empty on a perfectly good chemistry link too — a nation-plus-league
   * green shares no club at all.
   */
  clubs: readonly string[];
  /** Whether this link is complete under the puzzle's own rule. */
  made: boolean;
  /** The club the puzzle demands here, when it names one. */
  required?: string;
}

/**
 * Green is the bar, and hyper clears it.
 *
 * A chain has no chemistry total to accumulate — there is nothing for a hyper
 * link's extra point to offset — so the only question a link answers is
 * pass/fail. `meetsRequirement` already encodes that hyper outranks green.
 */
export function isGreen(colour: LinkColour | null): boolean {
  return colour !== null && meetsRequirement(colour, 'green');
}

/**
 * Whether two players are linked under `mode`.
 *
 * The single place the two rules differ, so the generator, the scorer and the
 * board cannot drift apart on what counts as a link.
 */
export function linked(a: Player, b: Player, mode: ChainMode): boolean {
  return mode === 'clubs' ? sharedClubs(a, b).length > 0 : isGreen(linkColour(a, b));
}

/**
 * Whether two players are linked, where the puzzle may name the club.
 *
 * A prescribed club REPLACES the mode's rule rather than adding to it, and it
 * is strictly harder: two players who share three clubs, none of them the
 * named one, do not make this link.
 */
export function linkedVia(
  a: Player, b: Player, mode: ChainMode, club: string | undefined,
): boolean {
  if (club === undefined) return linked(a, b, mode);
  return a.clubIds.includes(club) && b.clubIds.includes(club);
}

/**
 * Whether a player satisfies the clue on a plate. No clue, anyone.
 *
 * A position clue is met by anyone LISTED at that position: Mascherano is a
 * midfielder and a defender, and a board that asked for a defender and
 * refused him would be wrong in the way that loses an argument in a pub.
 */
export function clueMet(p: Player, clue: SlotClue | undefined): boolean {
  if (!clue) return true;
  if (clue.kind === 'nation') return p.nation === clue.value;
  return p.positions.includes(clue.value as Player['positions'][number]);
}

/**
 * The slots either side of `index`, each with the link that joins it.
 *
 * On a line the ends have one neighbour; on a ring (`closed`) the last slot
 * wraps to the first through link `length - 1`. Every place that reads "left
 * is i-1, right is i+1" goes through here, so a ring cannot be a line in one
 * file and a loop in another.
 */
export function neighboursOf(
  index: number, length: number, closed = false,
): { slot: number; link: number }[] {
  const out: { slot: number; link: number }[] = [];
  const wraps = closed && length > 2;
  if (index > 0) out.push({ slot: index - 1, link: index - 1 });
  else if (wraps) out.push({ slot: length - 1, link: length - 1 });
  if (index < length - 1) out.push({ slot: index + 1, link: index });
  else if (wraps) out.push({ slot: 0, link: length - 1 });
  return out;
}

/**
 * The occupied neighbours of `index`, each with the club its link names.
 *
 * This is the one description of "what is beside this slot" that both the
 * field (who may sit here) and the ruler (how obscure is sitting here) read,
 * so they cannot disagree about which neighbours a pick is measured against.
 */
export function sidesOf(
  index: number,
  fill: ChainFill,
  pool: ReadonlyMap<string, Player>,
  prescribed: Readonly<Record<number, string>> = {},
  closed = false,
): Side[] {
  const out: Side[] = [];
  for (const { slot, link } of neighboursOf(index, fill.length, closed)) {
    const id = fill[slot];
    const p = id ? pool.get(id) : undefined;
    if (p) out.push({ player: p, club: prescribed[link] });
  }
  return out;
}

/** The pairs of slots each link joins, in link order. */
export function linkPairs(length: number, closed = false): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < length - 1; i++) out.push([i, i + 1]);
  if (closed && length > 2) out.push([length - 1, 0]);
  return out;
}

export function chainLinks(
  fill: ChainFill,
  pool: ReadonlyMap<string, Player>,
  mode: ChainMode = 'chemistry',
  prescribed: Readonly<Record<number, string>> = {},
  closed = false,
): ChainLink[] {
  const out: ChainLink[] = [];
  for (const [i, [from, to]] of linkPairs(fill.length, closed).entries()) {
    const a = fill[from];
    const b = fill[to];
    const pa = a ? pool.get(a) : undefined;
    const pb = b ? pool.get(b) : undefined;
    const required = prescribed[i];
    out.push({
      index: i,
      colour: pa && pb ? linkColour(pa, pb) : null,
      // A prescribed link shows the club it demands, not the clubs the two
      // players happen to share, so the board says the same thing before and
      // after the reveal.
      clubs: required !== undefined ? [required] : pa && pb ? sharedClubs(pa, pb) : [],
      made: pa && pb ? linkedVia(pa, pb, mode, required) : false,
      required,
    });
  }
  return out;
}

export interface ChainProgress {
  made: number;
  total: number;
  solved: boolean;
}

export function chainProgress(links: readonly ChainLink[]): ChainProgress {
  const made = links.filter((l) => l.made).length;
  return { made, total: links.length, solved: links.length > 0 && made === links.length };
}

/**
 * Everyone who could legally sit at `index` given what is beside it right now.
 *
 * This is the denominator the obscurity score is measured against, so it has to
 * be the real field of legal answers rather than the whole pool — otherwise
 * every pick in a tightly constrained chain would read as "famous" simply
 * because the alternatives were unreachable.
 *
 * Two honest limitations of this first draft:
 *
 *  - It is LOCAL. A player who links green to both neighbours may still leave
 *    the rest of the chain unsolvable, and is counted here anyway. Computing
 *    the globally-valid field means enumerating whole solutions, which is a
 *    later job.
 *  - It is therefore mildly circular: your own choice at slot i+1 shapes the
 *    field slot i is scored against. In practice this is what you want — it
 *    asks "given the chain you actually built, how obscure was each step" —
 *    but it is worth knowing before anyone reads too much into a score.
 *
 * O(pool) per slot. At ~12k players and at most six slots that is a few
 * milliseconds, so it is left as a plain scan.
 */
export function chainFieldFor(
  index: number,
  fill: ChainFill,
  players: readonly Player[],
  pool: ReadonlyMap<string, Player>,
  mode: ChainMode = 'chemistry',
  prescribed: Readonly<Record<number, string>> = {},
  closed = false,
  clues: Readonly<Record<number, SlotClue>> = {},
): Player[] {
  // Each side carries its own requirement: the neighbour on it, and the
  // club its link may name.
  const neighbours = sidesOf(index, fill, pool, prescribed, closed);
  const clue = clues[index];

  // A prescribed link constrains this slot even with nobody beside it yet:
  // whoever sits here has to have played for that club.
  const own = neighboursOf(index, fill.length, closed)
    .map(({ link }) => prescribed[link])
    .filter((c): c is string => c !== undefined);

  // Nothing placed either side and nothing demanded: everyone is still legal.
  if (neighbours.length === 0 && own.length === 0 && !clue) return [...players];

  // The occupant of this slot must stay in its own field, or it would score 0
  // against a set it is excluded from by definition.
  const usedElsewhere = new Set<string>();
  fill.forEach((id, i) => { if (id && i !== index) usedElsewhere.add(id); });

  return players.filter(
    (p) => !usedElsewhere.has(p.id)
      && clueMet(p, clue)
      && own.every((c) => p.clubIds.includes(c))
      && neighbours.every((n) => linkedVia(p, n.player, mode, n.club)),
  );
}

/**
 * How deep a single pick dug.
 *
 * `score` is the 0..100 obscurity. `rank` and `fieldSize` are the same fact in
 * units a person can actually feel: "the 6th most obscure of 247 players who
 * would have fit". That framing is the point of the mode — the gate is finding
 * anyone who links, the score is finding someone nobody else would have.
 *
 * "Obscure" here means the FACT, not the name: the field is ranked by fame
 * scaled by how much of a stint carried the link, so Harry Kane through his
 * 13 games at Leicester outranks a journeyman who was there for years. See
 * src/lib/fame/spell.ts.
 *
 * Rank 1 is the most obscure answer available. Ties take the better rank. A
 * pick outside its own field — one that does not link — has no rank at all.
 */
export interface SlotDepth {
  score: number;
  rank: number | null;
  fieldSize: number;
}

/**
 * Depth per slot the player filled themselves.
 *
 * Given slots are excluded — they were not chosen, so scoring them would just
 * add a constant. An empty chain scores nothing rather than zero-as-a-result.
 */
export function chainSlotDepths(
  fill: ChainFill,
  given: ChainFill,
  players: readonly Player[],
  pool: ReadonlyMap<string, Player>,
  mode: ChainMode = 'chemistry',
  prescribed: Readonly<Record<number, string>> = {},
  closed = false,
  clues: Readonly<Record<number, SlotClue>> = {},
): Record<number, SlotDepth> {
  const out: Record<number, SlotDepth> = {};
  fill.forEach((id, i) => {
    if (!id || given[i]) return;
    const chosen = pool.get(id);
    if (!chosen) return;
    const field = chainFieldFor(i, fill, players, pool, mode, prescribed, closed, clues);
    const sides = sidesOf(i, fill, pool, prescribed, closed);
    const fameOf = (p: Player) => factFame(p, sides, mode);
    const inField = field.some((p) => p.id === chosen.id);
    const mine = fameOf(chosen);
    out[i] = {
      score: slotObscurityScore(chosen, field, fameOf),
      rank: inField ? field.filter((p) => fameOf(p) < mine).length + 1 : null,
      fieldSize: field.length,
    };
  });
  return out;
}

/** Obscurity per filled slot, 0..100. */
export function chainSlotObscurity(
  fill: ChainFill,
  given: ChainFill,
  players: readonly Player[],
  pool: ReadonlyMap<string, Player>,
  mode: ChainMode = 'chemistry',
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [slot, depth] of Object.entries(chainSlotDepths(fill, given, players, pool, mode))) {
    out[Number(slot)] = depth.score;
  }
  return out;
}

export function chainObscurity(perSlot: Readonly<Record<number, number>>): number {
  const vals = Object.values(perSlot);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
