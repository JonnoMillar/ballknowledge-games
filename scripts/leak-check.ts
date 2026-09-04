import { readFile } from 'node:fs/promises';
import { FORMATIONS } from '../src/lib/puzzle/formations';
import type { Board } from '../src/lib/puzzle/types';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Scans a mockup for any pool player name that is not already visible on the
 * board. Any such name beside an open slot is, by definition, an answer to it.
 * Spec: autocomplete searches the pool, it never lists it.
 */
const mockup = await readFile(process.argv[2]!, 'utf8');
const board = JSON.parse(await readFile('content/puzzles/003.json', 'utf8')) as Board;
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));

// Names legitimately on screen: the seeded players plus the ones depicted as solved.
const shown = new Set(
  [...Object.values(board.seeded), board.referenceSolution['LCM']!,
   board.referenceSolution['CM']!, board.referenceSolution['RCB']!]
    .map((id) => pool.get(id)!.name),
);

const leaks: string[] = [];
for (const p of players) {
  const surname = p.name.split(' ').slice(-1)[0]!;
  if (surname.length < 5) continue;              // too short to match reliably
  if ([...shown].some((n) => n.includes(surname))) continue;
  if (new RegExp(`\b${surname}\b`).test(mockup)) leaks.push(`${p.name} (fame ${p.fame.value})`);
}

console.log(leaks.length === 0
  ? 'clean — no pool player named on screen beyond those already placed'
  : `*** ${leaks.length} LEAKED ***\n  ` + leaks.slice(0, 20).join('\n  '));
