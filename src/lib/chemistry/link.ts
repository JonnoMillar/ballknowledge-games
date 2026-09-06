import type { LinkColour, PlayerFacts } from './types';

/**
 * Chemistry points per link, matching FIFA's documented table:
 *
 *   nothing shared                        0   red
 *   same league only, or same nation only 1   orange
 *   same league AND same nation           2   green
 *   same club, different nation           2   green
 *   same club AND same nation             3   green (we render this "hyper")
 *
 * An earlier version scored hyper as 2, on the reasoning that keeping every
 * link worth at most 2 made the arithmetic easier to do in your head. That was
 * invented, and wrong. Three is the real value, and it is what lets a hyper
 * link absorb a weak one elsewhere — which is exactly how FUT feels.
 */
const POINTS: Record<LinkColour, number> = { red: 0, orange: 1, green: 2, hyper: 3 };

/**
 * The per-link value that counts as "full". Green is enough for full
 * individual chemistry — an all-green squad reaches 100 in FUT, hyper links are
 * not required. Hyper's third point is therefore headroom, not a higher
 * ceiling.
 */
export const FULL_LINK_POINTS = 2;

/**
 * Constraint ordering, which is NOT the same as points. A board requiring
 * `green` is satisfied by `hyper`, so rank must separate them.
 */
const RANK: Record<LinkColour, number> = { red: 0, orange: 1, green: 2, hyper: 3 };

function intersects(a: readonly string[], b: readonly string[]): boolean {
  const set = new Set(a);
  return b.some((x) => set.has(x));
}

export function linkColour(a: PlayerFacts, b: PlayerFacts): LinkColour {
  const sameClub = intersects(a.clubIds, b.clubIds);
  const sameNation = a.nation === b.nation;
  const sameLeague = intersects(a.leagueIds, b.leagueIds);

  if (sameClub && sameNation) return 'hyper';
  if (sameClub || (sameNation && sameLeague)) return 'green';
  if (sameNation || sameLeague) return 'orange';
  return 'red';
}

export function linkPoints(colour: LinkColour): number {
  return POINTS[colour];
}

export function linkRank(colour: LinkColour): number {
  return RANK[colour];
}

/** A required colour of `any` imposes no constraint. Spec 4.4. */
export function meetsRequirement(
  achieved: LinkColour,
  required: LinkColour | 'any',
): boolean {
  if (required === 'any') return true;
  return linkRank(achieved) >= linkRank(required);
}

/**
 * Every club both players appeared for.
 *
 * The club dimension of the link table, returned rather than reduced to a
 * boolean, because in club-only mode the shared club IS the explanation shown
 * on the link — "these two are connected, and here is why".
 */
export function sharedClubs(a: PlayerFacts, b: PlayerFacts): string[] {
  const set = new Set(a.clubIds);
  return b.clubIds.filter((c) => set.has(c));
}
