/**
 * CHAIN — the mini format.
 *
 * A single line of players, each linked only to its immediate neighbours. Both
 * ends are given and deliberately share nothing: no club, no league, no nation.
 * The player fills the middle so that every link is green.
 *
 * There is no formation, no position rule and no chemistry total. A chain is
 * solved or it is not, and the score is how obscure the bridge you found was.
 * The whole format reuses `linkColour` untouched.
 */

/**
 * How a chain decides a link is complete.
 *
 * `chemistry` is the full FIFA link table: green needs a shared club OR the
 * same nation and league.
 *
 * `clubs` counts only a shared club. It is the stricter rule and the more
 * legible one — a nation-plus-league link is real but invisible, with nothing
 * to point at on screen, whereas a shared club can show the badge of the club
 * that connects the two players. The link explains itself.
 */
export type ChainMode = 'chemistry' | 'clubs';

/** A published chain. Slots are ordered left to right; links join i and i+1. */
export interface ChainPuzzle {
  id: string;
  /** Defaults to `chemistry` when absent, so existing content is unchanged. */
  mode?: ChainMode;
  /**
   * One entry per slot, in order: a given player's id, or null for a slot the
   * player must fill. `slots.length` is the chain length.
   */
  slots: readonly (string | null)[];
  /**
   * Proves the chain is solvable. Never the required answer — several hundred
   * distinct chains usually satisfy the same puzzle.
   *
   * Optional because it is STRIPPED before the puzzle reaches the browser. On
   * the XI boards the reference solution ships inside the client bundle, which
   * is a standing leak; chains do not repeat that.
   */
  referenceSolution?: readonly string[];
}

/** The line as it currently stands: a player id per slot, or null. */
export type ChainFill = readonly (string | null)[];
