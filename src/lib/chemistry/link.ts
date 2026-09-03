import type { LinkColour, PlayerFacts } from './types';

/**
 * Chemistry points. Hyper scores the same as green deliberately: it renders
 * distinctly to keep the FIFA visual language, but scoring it higher would
 * break the hand-computable requirement in spec 5.2.
 */
const POINTS: Record<LinkColour, number> = { red: 0, orange: 1, green: 2, hyper: 2 };

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
