import { readFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Samples the pool and prints each player with clubs and nation, for manual
 * comparison against Wikidata.
 *
 * Deliberately manual. Unit tests happily pass over data claiming a player
 * appeared for a club they never played for, and no automated check catches
 * that. Spec 12.
 */
const n = Number.parseInt(process.argv[2] ?? '20', 10);
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];

const sample = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
for (const p of sample) {
  console.log(`\n${p.name}  [${p.id}]  fame=${p.fame.value}  ${p.nation}`);
  console.log(`  positions: ${p.positions.join(', ')}`);
  console.log(`  clubs:     ${p.clubIds.join(', ')}`);
  console.log(`  check:     https://www.wikidata.org/wiki/${p.id}`);
}
console.log(`\n${n} players sampled. Open a few and confirm clubs and nation.`);
console.log('Record anything wrong in docs/superpowers/plans/coverage-findings.md.');
