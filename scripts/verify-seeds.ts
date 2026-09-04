import { readFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';
import type { Board } from '../src/lib/puzzle/types';

const board = JSON.parse(await readFile('content/puzzles/003.json', 'utf8')) as Board;
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));
const seeds = Object.entries(board.seeded).map(([slot, id]) => ({ slot, p: pool.get(id)! }));

console.log('GIVEN PLAYERS');
for (const s of seeds) {
  console.log(`  ${s.slot.padEnd(4)} ${s.p.name.padEnd(24)} nation=${s.p.nation.padEnd(7)} clubs=[${s.p.clubIds.join(',')}]`);
}
const nations = new Set(seeds.map((s) => s.p.nation));
const clubOverlap = seeds.some((a, i) => seeds.some((b, j) => i < j && a.p.clubIds.some((c) => b.p.clubIds.includes(c))));
const allOneLeague = seeds[0]!.p.leagueIds.some((l) => seeds[1]!.p.leagueIds.includes(l) && seeds[2]!.p.leagueIds.includes(l));
console.log('');
console.log(`  distinct nations : ${nations.size}/3  ${nations.size === 3 ? 'PASS' : 'FAIL'}`);
console.log(`  club overlap     : ${clubOverlap ? 'YES  FAIL' : 'none PASS'}`);
console.log(`  all one league   : ${allOneLeague ? 'YES  FAIL' : 'no   PASS'}`);
const xiNations = new Set(Object.values(board.referenceSolution).map((id) => pool.get(id)!.nation));
console.log(`  nations in XI    : ${xiNations.size}/11`);
