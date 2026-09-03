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

/** A pool entry: facts plus everything the app needs to display and score. */
export interface Player extends PlayerFacts {
  name: string;
  aliases: readonly string[];
  positions: readonly PositionClass[];
  fame: { value: number; source: 'sitelinks' | 'pageviews' | 'pickrate' | 'manual' };
}
