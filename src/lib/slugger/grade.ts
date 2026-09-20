import type { Player } from '../chemistry/types';
import { spellWeight } from '../fame/spell';

/**
 * How far a hit goes.
 *
 * A hit is graded by the fame of the FACT, not the player: fame scaled by
 * how much of a stint it was and how recent — the same ruler Chain ranks a
 * link by (see src/lib/fame/spell.ts). Kane at Tottenham is 96; Kane at
 * Leicester, thirteen games in 2013, is 25. The first is what everyone
 * knows and the second is what the pub means by "remember when he was
 * at…", and only the second deserves the home run.
 *
 * The bands are on the sitelink scale, where the pool's median is 27 and
 * the 90th percentile is 49. A single is a household name at the club that
 * made them; a double is a regular a fan of the club would list; a triple
 * is a name you have to reach for; a home run is a fact most fans do not
 * hold. The bands are global and deliberately so: a small club's most
 * famous player is still a single if they are famous. The pitcher's three
 * kinds of pitch are what make the small club pay, not the ruler.
 */
export type Bases = 1 | 2 | 3 | 4;

export const SINGLE_AT = 55;
export const DOUBLE_AT = 38;
export const TRIPLE_AT = 26;

export function basesFor(factFame: number): Bases {
  if (factFame >= SINGLE_AT) return 1;
  if (factFame >= DOUBLE_AT) return 2;
  if (factFame >= TRIPLE_AT) return 3;
  return 4;
}

/** The fame of "p played for club", on the sitelink scale. */
export function stintFame(p: Player, club: string, now?: number): number {
  return p.fame.value * spellWeight(p.spells?.[club], now);
}

export const BASES_NAME: Record<Bases, string> = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Home run' };
