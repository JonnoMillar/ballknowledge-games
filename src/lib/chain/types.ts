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

/**
 * How hard a chain is, as a shipped property of the board rather than a guess.
 *
 * The generator grades on ENTRY: the fame of the most famous player who would
 * satisfy a side, minimised over the two sides. It is the only measure that
 * predicts whether the first player who comes to mind is a legal answer. Field
 * size is the second lever and pulls the other way — a large field forgives a
 * bad guess — so a hard board is narrowed as well as deepened. See
 * scripts/build-graded-chains.ts.
 */
export type ChainDifficulty = 'easy' | 'medium' | 'hard';

/**
 * A clue printed on an empty plate: the nationality or the position of
 * whoever belongs there. Part of the rule, not a hint — a player who links
 * both neighbours but is not Argentine has not filled an "Argentine" plate.
 *
 * This is what makes a completion board possible. Two givens on their own
 * never pin a blank down: measured over 9,998 pairs of famous givens, 84%
 * have six or more answers a normal fan would think of. One clue on the
 * plate — measured with the same fact-fame ruler the obscurity boards rank
 * by, used as a cut-off instead — leaves 38,811 of those pairs with exactly
 * one answer in reach and nothing else above the floor. The clue gives the
 * solver the list to run through; the board is built so that the list has
 * one name on it.
 *
 * The label is hand-written ("an Argentine", "a goalkeeper") because the
 * pool carries Wikidata ids for nations and nothing to print them as.
 */
export interface SlotClue {
  kind: 'nation' | 'position';
  /** A nation QID, or a `PositionClass`. */
  value: string;
  label: string;
}

/** A published chain. Slots are ordered left to right; links join i and i+1. */
export interface ChainPuzzle {
  id: string;
  /** Defaults to `chemistry` when absent, so existing content is unchanged. */
  mode?: ChainMode;
  /**
   * Absent on the chains generated before grading existed. Shown on the board,
   * because a score is only comparable between players once they know they
   * were solving the same difficulty of board.
   */
  difficulty?: ChainDifficulty;
  /**
   * One entry per slot, in order: a given player's id, or null for a slot the
   * player must fill. `slots.length` is the chain length.
   */
  slots: readonly (string | null)[];
  /**
   * The chain is a ring: one more link joins the last slot back to the first,
   * so every slot has two neighbours and there are no ends. Link `n-1` joins
   * slot `n-1` and slot `0`.
   *
   * Drawn as the edges of a square — givens in the corners, blanks between —
   * which is the shape the ring board plays on. A ring of eight is four hubs
   * with two givens each; measured over 9,981 pairs of famous givens, none
   * had a single bridge, so this shape is Chain with the ends tied rather
   * than a single-answer puzzle. Every blank keeps a field to dig in.
   */
  closed?: boolean;
  /**
   * One clue per blank, keyed by slot index. See `SlotClue`.
   */
  clues?: Readonly<Record<number, SlotClue>>;
  /**
   * One line about why this board is the shape it is, printed on the sealed
   * sheet beside the count of ways it could have gone.
   *
   * Hand-written, and deliberately not generated: the interesting thing about
   * a board is never its statistics, it is the observation the statistics are
   * evidence for. "16 fit the first, 16 the second" is the measurement;
   * "half of Everton has been to Barcelona or Madrid" is what it means, and
   * only the second one is worth reading twice.
   *
   * Withheld until lock-in with everything else — it is a remark about the
   * shape of the answer space, which is not a thing to hand someone who is
   * still searching it.
   */
  caption?: string;
  /**
   * Links that name the club that has to make them, keyed by link index — link
   * `i` joins slot `i` and slot `i+1`. Shown on the board from the start, as a
   * badge on an empty link.
   *
   * This exists to make two adjacent blanks playable. Measured over 2,642
   * pairs of famous ends in club mode, "find two players who link to each
   * other and to an end apiece" admits more than 600 answers for 2,551 of
   * them, and lands in a playable range for NONE — the club graph is simply
   * too dense for adjacency to be a constraint. Naming the club collapses it:
   * 2,563 of the same 2,642 pairs then have at least one club that yields a
   * sane answer count, with a median of 211 clubs to choose between. See
   * scripts/measure-layouts.ts.
   *
   * A prescribed link is not a hint. It is a harder rule than the mode's own:
   * sharing some other club is no longer enough.
   */
  prescribedLinks?: Readonly<Record<number, string>>;
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
