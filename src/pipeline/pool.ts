import type { Player } from '../lib/chemistry/types';
import type { RawPlayer } from './normalise';

export interface PoolRules {
  /** Minimum sitelinks. Per-league tunable, not a global constant. Spec 7.3. */
  fameFloor: number;
  /** Earliest spell start year. Spec 7.3. */
  eraFrom: number;
}

/**
 * Initial values from spec 14. The floor exists because pure lowest-fame-wins
 * selects academy players nobody can recognise, which destroys the social proof
 * the score exists for. Spec 6.3.
 */
export const DEFAULT_POOL_RULES: PoolRules = { fameFloor: 20, eraFrom: 1992 };

export function applyPoolFilters(
  players: readonly RawPlayer[],
  rules: PoolRules,
): Player[] {
  const out: Player[] = [];

  for (const p of players) {
    if (p.sitelinks < rules.fameFloor) continue;

    const years = p.clubs.map((c) => c.from).filter((y): y is number => y !== null);
    // No dated spell means we cannot place them in an era. Drop rather than guess.
    if (years.length === 0) continue;
    if (Math.max(...years) < rules.eraFrom) continue;

    if (p.positions.length === 0) continue;

    out.push({
      id: p.id,
      name: p.name,
      aliases: p.aliases,
      nation: p.nation,
      positions: p.positions,
      clubIds: [...new Set(p.clubs.map((c) => c.clubId))],
      leagueIds: [...new Set(p.clubs.map((c) => c.leagueId))],
      fame: { value: p.sitelinks, source: 'sitelinks' },
    });
  }

  return out;
}
