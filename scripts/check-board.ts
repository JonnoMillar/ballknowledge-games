import { readFile } from 'node:fs/promises';
import { isValidPlacement, scoreBoard } from '../src/lib/puzzle/validate';
import { FORMATIONS } from '../src/lib/puzzle/formations';
import { adjacentSlots } from '../src/lib/puzzle/edges';
import type { Board, Placement } from '../src/lib/puzzle/types';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Board difficulty report.
 *
 * Deliberately does NOT use whole-board solution counts. Enumeration over a
 * 12k pool always hits its cap, and answer sets derived from a capped search
 * are a biased sample of whichever branches were explored first — they look
 * authoritative and are not.
 *
 * Instead this simulates the actual player experience: walk the reference
 * solution slot by slot, and at each step count how many pool players would be
 * legal *given only what is solved so far*. That is exactly the rule the game
 * enforces (spec 4.1), so it is the honest difficulty measure.
 */
const path = process.argv[2];
if (!path) { console.error('usage: check-board <file>'); process.exit(1); }

const board = JSON.parse(await readFile(path, 'utf8')) as Board;
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));
const formation = FORMATIONS[board.formationId];
if (!formation) throw new Error(`unknown formation ${board.formationId}`);

const score = scoreBoard(formation, pool, board.referenceSolution);
console.log(`${board.id}: chemistry ${score.squadChemistry}/110  solved=${score.solved}`);
console.log(`seeded: ${Object.keys(board.seeded).join(', ')}\n`);

// Solve order: most-constrained first, i.e. most solved neighbours.
const filled: Record<string, string> = { ...board.seeded };
const remaining = formation.slots.filter((s) => !board.seeded[s.id]).map((s) => s.id);

console.log('slot   options  fame range   the deep cuts available');
console.log('─────────────────────────────────────────────────────────────');

let tightest = Infinity, loosest = 0;
while (remaining.length > 0) {
  remaining.sort((a, b) =>
    adjacentSlots(formation, b).filter((n) => filled[n]).length -
    adjacentSlots(formation, a).filter((n) => filled[n]).length);
  const slotId = remaining.shift()!;
  const slot = formation.slots.find((s) => s.id === slotId)!;

  const legal = players.filter((p) =>
    !Object.values(filled).includes(p.id) &&
    isValidPlacement(board, formation, pool, filled as Placement, slotId, p).ok);
  legal.sort((a, b) => a.fame.value - b.fame.value);

  tightest = Math.min(tightest, legal.length);
  loosest = Math.max(loosest, legal.length);

  const lo = legal[0]?.fame.value ?? 0;
  const hi = legal[legal.length - 1]?.fame.value ?? 0;
  const deep = legal.filter((p) => p.fame.value <= 30).slice(0, 3).map((p) => p.name).join(', ');
  console.log(
    `${slotId.padEnd(5)} ${String(legal.length).padStart(7)}  ${String(lo).padStart(3)}–${String(hi).padEnd(4)}   ${deep || '(none)'}`,
  );

  filled[slotId] = board.referenceSolution[slotId]!;
}

console.log(`\ntightest slot ${tightest} options, loosest ${loosest}`);
console.log('TARGET: no slot under ~4 (trial and error) or over ~150 (fame lottery).');
