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

/** One print on the wall of answers the sealed sheet puts up. */
export interface PinnedAnswer {
  id: string;
  name: string;
  /** Obscurity within the field it belongs to, on the same 0–100 scale. */
  score: number;
  /** The clubs that made it fit, one per side, in slot order. */
  clubs: string[];
  /** Would have worked in BOTH gaps. The most useful card on the wall. */
  either: boolean;
  /** The gap it answers, or null when it answers either. */
  slotIndex: number | null;
  fieldSize: number;
  /** The player actually played this one, so the wall can say so. */
  mine: boolean;
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
  /**
   * How many distinct ways the board could have been filled, over all its
   * blanks at once. Null unless the board has exactly two, which is the only
   * layout that ships — see the pair-layout measurement in HANDOFF.
   *
   * This is a PRODUCT minus a correction, not a sum: the two slots need two
   * different players, so every pairing that would use the same man twice
   * comes back off. The correction is the size of the overlap between the two
   * fields, which on chain 006 is the difference between 256 and 254.
   */
  pairs: number | null;
  /** Up to five answers that would have worked, deepest first. */
  pinboard: PinnedAnswer[];
  /**
   * The grade, re-measured from the board rather than read off its label.
   *
   * ENTRY is the fame of the LESS famous half of the most findable legal pair:
   * "if you took the easiest way in, how obscure is the harder of the two
   * names you still had to produce". It answers the only question that decides
   * difficulty — is there an obvious way in — and it is what the shipped
   * boards were graded on. Null when there is no legal pair at all.
   */
  entry: number | null;
}

/**
 * The most findable legal pair, without enumerating the pairs.
 *
 * The naive version is a double loop, and on a board whose fields run to
 * hundreds it is a hundred thousand comparisons on the main thread at the
 * exact moment the reveal is trying to animate. It is also unnecessary: sort
 * both sides by fame and the answer is at the top. Take the two most famous;
 * if they are the same player — which is the whole reason this is not just
 * `min(max(A), max(B))` — the best you can do is that man beside the runner-up
 * on the other side, so try it both ways round and keep the better.
 */
function entryOf(a: readonly Player[], b: readonly Player[]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  const byFame = (xs: readonly Player[]) => [...xs].sort((x, y) => y.fame.value - x.fame.value);
  const A = byFame(a);
  const B = byFame(b);
  if (A[0]!.id !== B[0]!.id) return Math.min(A[0]!.fame.value, B[0]!.fame.value);
  const left = B[1] ? Math.min(A[0]!.fame.value, B[1].fame.value) : null;
  const right = A[1] ? Math.min(A[1].fame.value, B[0]!.fame.value) : null;
  if (left === null && right === null) return null;
  return Math.max(left ?? -Infinity, right ?? -Infinity);
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

  /**
   * Which club carried each side for a player sitting at slot `i`.
   *
   * Read off the GIVEN neighbours rather than off the player's own fill, for
   * the same reason `best` is: a wrong pick must not get to decide what the
   * right answer is said to have in common.
   */
  const carriedAt = (p: Player, i: number): string[] => {
    const out: string[] = [];
    for (const [n, link] of [[i - 1, i - 1], [i + 1, i]] as const) {
      // A named club is the rule for that side whatever sits on the far end
      // of it. On the pair layout the far end IS the other blank, and skipping
      // it left the reveal painting one colour on both halves of a diagonal
      // whose whole job is to name two clubs.
      const named = prescribed[link];
      if (named !== undefined) { out.push(named); continue; }
      const other = puzzle.slots[n];
      if (other == null) continue;
      const shared = pool.get(other)?.clubIds.find((c) => p.clubIds.includes(c));
      if (shared) out.push(shared);
    }
    return out;
  };

  const slots: SlotOutcome[] = [];
  /** Kept so the reveal can state how many ways the board could have gone. */
  const fields: Player[][] = [];
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
    fields.push(field);

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

    slots.push({
      index: i,
      playerId: fill[i] ?? null,
      held,
      depth: depths[i] ?? null,
      best: most
        ? { id: most.id, name: most.name, score: slotObscurityScore(most, field), clubs: carriedAt(most, i) }
        : null,
      fieldSize: field.length,
    });
  });

  const made = links.filter((l) => l.made).length;
  const scored = slots.map((s) => (s.held && s.depth ? s.depth.score : 0));
  const score = scored.length === 0
    ? 0
    : Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);

  /**
   * The wall of answers.
   *
   * One name per blank is not a reveal, it is a correction — and it wastes
   * the most interesting thing the game knows. Sixteen players could have
   * filled each of chain 006's two gaps and the whole point of the screen is
   * that a fan has heard of about four of them.
   *
   * The order is chosen so the wall makes an argument rather than listing:
   * anyone who fits EITHER gap goes up first, because that is the single
   * most useful fact about the board, then the deepest couple from each side.
   * The fame floor is the same one `best` uses — see the note there about
   * Rodrigo Riep — so the wall never holds up a Wikidata error as the thing
   * the player should have known.
   */
  const pinboard: PinnedAnswer[] = [];
  const onWall = new Set<string>();
  const deepestFirst = (xs: readonly Player[]) =>
    xs.filter((p) => p.fame.value >= MIN_BEST_FAME).sort((a, b) => a.fame.value - b.fame.value);

  const add = (p: Player, slotIndex: number, either: boolean) => {
    if (onWall.has(p.id) || pinboard.length >= 5) return;
    onWall.add(p.id);
    const field = fields[slots.findIndex((s) => s.index === slotIndex)] ?? [];
    pinboard.push({
      id: p.id,
      name: p.name,
      score: slotObscurityScore(p, field),
      // An "either" card is claimed by no single slot, so the clubs on it are
      // the ones that carry the gap it is standing in.
      clubs: carriedAt(p, slotIndex),
      either,
      slotIndex: either ? null : slotIndex,
      fieldSize: field.length,
      mine: fill[slotIndex] === p.id,
    });
  };

  if (fields.length === 2 && slots.length === 2) {
    const bIds = new Set(fields[1]!.map((p) => p.id));
    const both = deepestFirst(fields[0]!.filter((p) => bIds.has(p.id)));
    if (both[0]) add(both[0], slots[0]!.index, true);
  }
  // One round of the deepest from each side, then a second, so the wall
  // alternates rather than showing one gap's answers and then the other's.
  for (let round = 0; round < 2; round++) {
    slots.forEach((s, si) => {
      const next = deepestFirst(fields[si] ?? []).find((p) => !onWall.has(p.id));
      if (next) add(next, s.index, false);
    });
  }

  // Only the two-blank layout gets a pair count. Three blanks is not a
  // product of two fields — the middle one's field depends on what the other
  // two took — and quoting a number that assumed otherwise would be worse
  // than quoting none.
  let pairs: number | null = null;
  let entry: number | null = null;
  if (fields.length === 2) {
    const [a, b] = fields as [Player[], Player[]];
    const bIds = new Set(b.map((p) => p.id));
    const both = a.filter((p) => bIds.has(p.id)).length;
    pairs = a.length * b.length - both;
    entry = entryOf(a, b);
  }

  return {
    made,
    total: links.length,
    perfect: links.length > 0 && made === links.length,
    score,
    slots,
    links: links.map((l) => l.made),
    pairs,
    pinboard,
    entry,
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
