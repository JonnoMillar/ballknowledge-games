import { chainLinks, chainFieldFor, chainSlotDepths } from './score';
import { slotObscurityScore } from '../fame/obscurity';
import type { SlotDepth } from './score';
import type { ChainFill, ChainPuzzle } from './types';
import type { Player } from '../chemistry/types';

/**
 * Everything that becomes true the moment a chain is locked in, in one place.
 *
 * Before lock-in the board tells the player nothing: no link colours, no score,
 * no field sizes. A chain where the links light up as you go has no risk in it
 * — you can shuffle names until the board turns green and the only cost is
 * time. Withholding all of it until the commitment is what turns a lookup into
 * a bet, so the reveal is a single event with a single shape, and this is it.
 */

/** What happened at one slot the player filled. */
export interface SlotOutcome {
  index: number;
  playerId: string | null;
  /** Both of this slot's links held. A slot with one bad side scores nothing. */
  held: boolean;
  /** Null when the slot was left empty or the pick linked to nothing. */
  depth: SlotDepth | null;
  /**
   * The most obscure answer that would have worked here, measured against the
   * slot's GIVEN neighbours rather than against what the player actually
   * placed — otherwise a wrong pick would be told it missed answers that its
   * own wrongness invented.
   */
  best: {
    id: string;
    name: string;
    score: number;
    /**
     * The clubs that made this answer fit, one per side, in slot order. The
     * reveal paints them as the diagonal on the answer's photo, so it has to
     * be the club that ACTUALLY satisfied each link — a prescribed link is
     * satisfied by the named club and nothing else.
     */
    clubs: string[];
  } | null;
  /** How many answers existed, by the same measure as `best`. */
  fieldSize: number;
}

export interface ChainResult {
  made: number;
  total: number;
  /** Every link held. The gate — obscurity only means anything past it. */
  perfect: boolean;
  /**
   * 0..100, and comparable across boards.
   *
   * Each blank scores its own obscurity within its own field, so a slot with
   * eleven possible answers and a slot with four hundred are on the same
   * scale, and the chain is the mean of its blanks rather than a sum — a
   * five-long chain and a seven-long one produce numbers that mean the same
   * thing. A slot whose links did not hold scores zero: the gate is finding
   * anyone at all, and obscurity is only worth counting past it.
   */
  score: number;
  slots: SlotOutcome[];
  links: readonly boolean[];
}

/**
 * Fame floor for the answer the reveal NAMES. Matches the floor the board
 * generator uses for its reference solution, so the game and the content it
 * ships agree about what counts as a checkable answer.
 * See scripts/build-graded-chains.ts.
 */
const MIN_BEST_FAME = 30;

export function chainResult(
  fill: ChainFill,
  puzzle: ChainPuzzle,
  players: readonly Player[],
  pool: ReadonlyMap<string, Player>,
): ChainResult {
  const mode = puzzle.mode ?? 'chemistry';
  const prescribed = puzzle.prescribedLinks ?? {};
  const links = chainLinks(fill, pool, mode, prescribed);
  const depths = chainSlotDepths(fill, puzzle.slots, players, pool, mode, prescribed);

  const slots: SlotOutcome[] = [];
  puzzle.slots.forEach((given, i) => {
    if (given != null) return;

    // A slot is only as good as both its sides. Either link failing means the
    // pick did not do its job, whoever it was.
    const left = i === 0 ? true : (links[i - 1]?.made ?? false);
    const right = i === fill.length - 1 ? true : (links[i]?.made ?? false);
    const held = left && right;

    // Scored against the puzzle, not against the player's own answer. On the
    // alternating layout these are the same set; they diverge as soon as two
    // blanks sit next to each other.
    const field = chainFieldFor(i, puzzle.slots, players, pool, mode, prescribed);

    // The deepest answer ABOVE a fame floor, not the deepest outright.
    //
    // This line is the one the reveal holds up as the answer you missed, and
    // taking the single most obscure member of the field aims it at the
    // least-curated corner of Wikidata. Chain 006 did exactly that: it named
    // Rodrigo Riep, a Chilean journeyman whose career is otherwise entirely
    // South American and whose Everton and Barcelona spells are Everton de
    // Viña del Mar and Barcelona S.C. Verified upstream, so not ours to fix.
    //
    // The field is untouched — Riep still counts, still scores, still sits in
    // `fieldSize` — because he IS a legal answer under the rule we ship. He
    // just does not get presented as the thing you should have known.
    const eligible = field.filter((p) => p.fame.value >= MIN_BEST_FAME);
    const most = (eligible.length > 0 ? eligible : field).reduce<Player | null>(
      (best, p) => (best === null || p.fame.value < best.fame.value ? p : best),
      null,
    );

    // Which club carried each side. Read off the GIVEN neighbours for the same
    // reason `best` is: the player's own fill may be wrong, and a wrong pick
    // must not decide what the right answer is said to have in common.
    const carried = (p: Player): string[] => {
      const out: string[] = [];
      for (const [n, link] of [[i - 1, i - 1], [i + 1, i]] as const) {
        // A named club is the rule for that side whatever sits on the far end
        // of it. On the pair layout the far end IS the other blank, and
        // skipping it left the reveal painting one colour on both halves of a
        // diagonal whose whole job is to name two clubs.
        const named = prescribed[link];
        if (named !== undefined) { out.push(named); continue; }
        const other = puzzle.slots[n];
        if (other == null) continue;
        const shared = pool.get(other)?.clubIds.find((c) => p.clubIds.includes(c));
        if (shared) out.push(shared);
      }
      return out;
    };

    slots.push({
      index: i,
      playerId: fill[i] ?? null,
      held,
      depth: depths[i] ?? null,
      best: most
        ? { id: most.id, name: most.name, score: slotObscurityScore(most, field), clubs: carried(most) }
        : null,
      fieldSize: field.length,
    });
  });

  const made = links.filter((l) => l.made).length;
  const scored = slots.map((s) => (s.held && s.depth ? s.depth.score : 0));
  const score = scored.length === 0
    ? 0
    : Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);

  return {
    made,
    total: links.length,
    perfect: links.length > 0 && made === links.length,
    score,
    slots,
    links: links.map((l) => l.made),
  };
}

/**
 * The result as a line of text worth pasting to a group chat.
 *
 * Wordle's grid works because it proves the shape of your attempt without
 * giving the answer away, so a friend who has not played yet still can. The
 * links do that here: they show exactly how well the chain held and nothing
 * about who is in it.
 */
export function shareText(result: ChainResult, chainId: string): string {
  const grid = result.links.map((made) => (made ? '🟩' : '🟥')).join('');
  const head = `Recall XI · Chain ${chainId}`;
  const line = result.perfect
    ? `${grid} ${result.score}`
    : `${grid} broken (${result.made}/${result.total})`;
  return `${head}\n${line}`;
}
