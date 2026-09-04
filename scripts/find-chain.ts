import { readFile } from 'node:fs/promises';
import { linkColour } from '../src/lib/chemistry/link';
import type { Player } from '../src/lib/chemistry/types';

/**
 * CHAIN — the mini format.
 *
 * A row of players linked only to their immediate neighbours. Both ends are
 * given and deliberately share nothing: no club, no league, no nation. The
 * player fills the middle so every link is green.
 *
 * Reuses linkColour untouched. There is no formation, no chemistry total and
 * no position rule — just a path.
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const green = (a: Player, b: Player) => {
  const c = linkColour(a, b);
  return c === 'green' || c === 'hyper';
};
const disjoint = (a: Player, b: Player) =>
  a.nation !== b.nation &&
  !a.clubIds.some((c) => b.clubIds.includes(c)) &&
  !a.leagueIds.some((l) => b.leagueIds.includes(l));

// Index by club so we only ever consider genuine link candidates.
const byClub = new Map<string, Player[]>();
for (const p of pool) for (const c of p.clubIds) {
  if (!byClub.has(c)) byClub.set(c, []);
  byClub.get(c)!.push(p);
}
const neighbours = (p: Player) => {
  const out = new Set<Player>();
  for (const c of p.clubIds) for (const q of byClub.get(c) ?? []) if (q.id !== p.id) out.add(q);
  return [...out];
};

const famous = pool.filter((p) => p.fame.value >= 70);
let rng = Number(process.argv[2] ?? 7);
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;

console.log('CHAIN puzzles — both ends given, share nothing, fill the middle all-green\n');

let found = 0;
for (let attempt = 0; attempt < 400000 && found < 4; attempt++) {
  const a = pick(famous);
  const b = pick(famous);
  if (a.id === b.id || !disjoint(a, b)) continue;

  // A - x - y - B, every link green.
  for (const x of neighbours(a)) {
    if (x.id === b.id) continue;
    const ys = neighbours(x).filter((y) => y.id !== a.id && y.id !== x.id && green(y, b));
    if (ys.length === 0) continue;
    const y = ys.sort((m, n) => m.fame.value - n.fame.value)[0]!;
    console.log(`  ${a.name}  (${a.fame.value})`);
    console.log(`     |`);
    console.log(`  ?  ${x.name}  (${x.fame.value})`);
    console.log(`     |`);
    console.log(`  ?  ${y.name}  (${y.fame.value})`);
    console.log(`     |`);
    console.log(`  ${b.name}  (${b.fame.value})`);
    console.log(`     ${ys.length} valid choices for the second slot alone\n`);
    found++;
    break;
  }
}
if (found === 0) console.log('  none found');
