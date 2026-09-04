import { readFile } from 'node:fs/promises';
import { linkColour } from '../src/lib/chemistry/link';
import { FORMATIONS } from '../src/lib/puzzle/formations';
import type { Board } from '../src/lib/puzzle/types';
import type { Player } from '../src/lib/chemistry/types';

const board = JSON.parse(await readFile(`content/puzzles/${process.argv[2]}.json`, 'utf8')) as Board;
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));
const f = FORMATIONS[board.formationId]!;

console.log('SLOT  SEEDED  PLAYER                      NAT      FAME  CLUBS');
for (const s of f.slots) {
  const p = pool.get(board.referenceSolution[s.id]!)!;
  console.log(
    s.id.padEnd(5),
    (board.seeded[s.id] ? ' yes  ' : '  -   '),
    p.name.padEnd(27),
    p.nation.padEnd(8),
    String(p.fame.value).padStart(4),
    ' ', p.clubIds.length,
  );
}
console.log('\nLINKS');
for (const [a, b] of f.adjacency) {
  const c = linkColour(pool.get(board.referenceSolution[a]!)!, pool.get(board.referenceSolution[b]!)!);
  console.log(`  ${a.padEnd(4)} ${b.padEnd(4)} ${c}`);
}
