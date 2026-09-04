import { readFile } from 'node:fs/promises';
import { isValidPlacement } from '../src/lib/puzzle/validate';
import { FORMATIONS } from '../src/lib/puzzle/formations';
import type { Board, Placement } from '../src/lib/puzzle/types';
import type { Player } from '../src/lib/chemistry/types';

const board = JSON.parse(await readFile('content/puzzles/003.json', 'utf8')) as Board;
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));
const f = FORMATIONS['433']!;

// The mid-game state the mockup depicts.
const filled: Record<string, string> = {
  ...board.seeded,
  LCM: board.referenceSolution['LCM']!,
  CM: board.referenceSolution['CM']!,
  RCB: board.referenceSolution['RCB']!,
};

for (const name of ['Philippe Sandler', 'John Stones', 'Aymeric Laporte']) {
  const p = players.find((x) => x.name === name);
  if (!p) { console.log(`${name.padEnd(18)} NOT IN POOL`); continue; }
  const r = isValidPlacement(board, f, pool, filled as Placement, 'LCB', p);
  console.log(
    name.padEnd(18),
    `fame ${String(p.fame.value).padStart(3)}`,
    r.ok ? '  VALID at LCB' : `  invalid (${r.reason}${r.ok ? '' : ' ' + r.failedEdges.join(',')})`,
  );
}
