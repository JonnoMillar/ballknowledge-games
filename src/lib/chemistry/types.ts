/** A link's colour, using the FIFA pre-23 names kept in spec 5.1. */
export type LinkColour = 'red' | 'orange' | 'green' | 'hyper';

/** Coarse position class. Spec 5.3 — deliberately coarse, P413 cannot support more. */
export type PositionClass = 'GK' | 'DEF' | 'MID' | 'FWD';

/**
 * The minimum a player needs for the chemistry engine.
 * Career/all-time model: clubIds and leagueIds are every club and league
 * the player ever appeared for. No dates. Spec 7.1.
 */
export interface PlayerFacts {
  id: string;
  nation: string;
  clubIds: readonly string[];
  leagueIds: readonly string[];
}

/**
 * One club stint, summed over every spell at that club: league appearances,
 * and calendar years there. Either is null where Wikidata is silent.
 */
export type Spell = readonly [apps: number | null, years: number | null];

/** A pool entry: facts plus everything the app needs to display and score. */
export interface Player extends PlayerFacts {
  name: string;
  aliases: readonly string[];
  positions: readonly PositionClass[];
  fame: { value: number; source: 'sitelinks' | 'pageviews' | 'pickrate' | 'manual' };
  /**
   * Per club, how much of a stint it was. Optional: a hand-built fixture
   * without it scores as if every spell were a full one.
   *
   * This is what lets the obscurity score tell Kane's 13 games at Leicester
   * from his 317 at Tottenham. See src/lib/fame/spell.ts.
   */
  spells?: Readonly<Record<string, Spell>>;
}
