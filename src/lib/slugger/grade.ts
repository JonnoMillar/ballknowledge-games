import type { Player } from '../chemistry/types';
import { spellWeight } from '../fame/spell';
import type { PitchKind } from './deck';

/**
 * How far a hit goes: as far as the pitch was worth.
 *
 * The first draft graded a hit by how obscure the name was, and it failed
 * at the table for the reason it was clever — the batter could not see
 * the grade before swinging, so there was nothing to aim at, and a giant
 * club could never get anyone out, so the pitcher's choice was no choice.
 * Now the pitch decides: a fastball (a giant club) is a single if it's
 * hit, a knuckleball (a small club) is a home run. The pitcher reads the
 * batter and the runners and picks the risk; the batter just has to get
 * the hit. That is the whole decision in baseball, and it fits in one line.
 */
export type Bases = 1 | 2 | 3 | 4;

export const BASES_FOR: Readonly<Record<PitchKind, Bases>> = {
  fastball: 1,
  curveball: 2,
  slider: 3,
  knuckleball: 4,
};

export const BASES_NAME: Record<Bases, string> = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Home run' };

/**
 * The fame of "p played for club", on the sitelink scale: fame scaled by
 * how much of a stint it was and how recent (src/lib/fame/spell.ts). Not a
 * grade any more; it is the ruler the deck is tiered with, so that a club
 * lands in the pile that matches how many names a pub actually holds for it.
 */
export function stintFame(p: Player, club: string, now?: number): number {
  return p.fame.value * spellWeight(p.spells?.[club], now);
}
