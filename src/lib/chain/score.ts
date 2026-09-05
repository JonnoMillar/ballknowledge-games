import { linkColour, meetsRequirement } from '../chemistry/link';
import { slotObscurityScore } from '../fame/obscurity';
import type { LinkColour, Player } from '../chemistry/types';
import type { ChainFill } from './types';

/** Link i joins slot i and slot i+1. Null colour while either end is empty. */
export interface ChainLink {
  index: number;
  colour: LinkColour | null;
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

export function chainLinks(fill: ChainFill, pool: ReadonlyMap<string, Player>): ChainLink[] {
  const out: ChainLink[] = [];
  for (let i = 0; i < fill.length - 1; i++) {
    const a = fill[i];
    const b = fill[i + 1];
    const pa = a ? pool.get(a) : undefined;
    const pb = b ? pool.get(b) : undefined;
    out.push({ index: i, colour: pa && pb ? linkColour(pa, pb) : null });
  }
  return out;
}

export interface ChainProgress {
  made: number;
  total: number;
  solved: boolean;
}

export function chainProgress(links: readonly ChainLink[]): ChainProgress {
  const made = links.filter((l) => isGreen(l.colour)).length;
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
): Player[] {
  const neighbours: Player[] = [];
  for (const n of [index - 1, index + 1]) {
    const id = fill[n];
    const p = id ? pool.get(id) : undefined;
    if (p) neighbours.push(p);
  }
  // Nothing placed either side yet: every player is still a legal answer.
  if (neighbours.length === 0) return [...players];

  // The occupant of this slot must stay in its own field, or it would score 0
  // against a set it is excluded from by definition.
  const usedElsewhere = new Set<string>();
  fill.forEach((id, i) => { if (id && i !== index) usedElsewhere.add(id); });

  return players.filter(
    (p) => !usedElsewhere.has(p.id) && neighbours.every((n) => isGreen(linkColour(p, n))),
  );
}

/**
 * Obscurity per slot the player filled themselves, 0..100.
 *
 * Given slots are excluded — they were not chosen, so scoring them would just
 * add a constant. An empty chain scores nothing rather than zero-as-a-result.
 */
export function chainSlotObscurity(
  fill: ChainFill,
  given: ChainFill,
  players: readonly Player[],
  pool: ReadonlyMap<string, Player>,
): Record<number, number> {
  const out: Record<number, number> = {};
  fill.forEach((id, i) => {
    if (!id || given[i]) return;
    const chosen = pool.get(id);
    if (!chosen) return;
    out[i] = slotObscurityScore(chosen, chainFieldFor(i, fill, players, pool));
  });
  return out;
}

export function chainObscurity(perSlot: Readonly<Record<number, number>>): number {
  const vals = Object.values(perSlot);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
