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

/**
 * `infoboxYears` is each player's stint start years from the enwiki infobox
 * (data/careers.json). They date a player Wikidata records no dated spell for:
 * Tyrique George has no P54 at all.
 *
 * A player with no position class is kept with none. Pedri and Mkhitaryan
 * were dropped for it (102 players, 2026-09-25). Positions only narrow a
 * field (an XI slot, a Chain position clue), so a missing one costs a player
 * those fields and nothing else; dropping him costs him every game.
 * scripts/merge-careers.ts fills most of them from the infobox.
 */
export function applyPoolFilters(
  players: readonly RawPlayer[],
  rules: PoolRules,
  infoboxYears: ReadonlyMap<string, readonly number[]> = new Map(),
): Player[] {
  const out: Player[] = [];

  for (const p of players) {
    if (p.sitelinks < rules.fameFloor) continue;

    const years = [
      ...p.clubs.map((c) => c.from).filter((y): y is number => y !== null),
      ...(infoboxYears.get(p.id) ?? []),
    ];
    // No dated spell means we cannot place them in an era. Drop rather than guess.
    if (years.length === 0) continue;
    if (Math.max(...years) < rules.eraFrom) continue;

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
