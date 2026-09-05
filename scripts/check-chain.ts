import { readFile } from 'node:fs/promises';
import { chainSlotDepths, chainFieldFor } from '../src/lib/chain/score';
import type { ChainPuzzle } from '../src/lib/chain/types';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Report what a solved chain actually scores, using the same code the UI does.
 *
 * Usage: tsx scripts/check-chain.ts <chainId> [playerQid...]
 *
 * With no player ids it checks the reference solution. The point is to be able
 * to confirm a number seen on screen against the engine, rather than reasoning
 * about why they differ.
 */
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));

const id = process.argv[2] ?? '001';
const chain = JSON.parse(await readFile(`content/chains/${id}.json`, 'utf8')) as ChainPuzzle;

const overrides = process.argv.slice(3);
const fill = [...chain.slots];
let n = 0;
fill.forEach((slot, i) => {
  if (slot !== null) return;
  fill[i] = overrides[n] ?? chain.referenceSolution?.[i] ?? null;
  n++;
});

console.log(`chain ${id}:`);
for (const [i, pid] of fill.entries()) {
  const p = pid ? pool.get(pid) : undefined;
  const given = chain.slots[i] != null;
  console.log(`  ${i} ${given ? 'GIVEN' : ' FILL'}  ${p?.name ?? '(empty)'}`);
}

const depths = chainSlotDepths(fill, chain.slots, players, pool);
console.log('\nper filled slot:');
let total = 0;
let count = 0;
for (const [slot, d] of Object.entries(depths)) {
  const field = chainFieldFor(Number(slot), fill, players, pool);
  const most = [...field].sort((a, b) => a.fame.value - b.fame.value)[0];
  console.log(
    `  slot ${slot}: score ${d.score}  rank ${d.rank} of ${d.fieldSize}` +
      `  (most obscure available: ${most?.name} @ ${most?.fame.value})`,
  );
  total += d.score;
  count++;
}
console.log(`\nchain obscurity: ${count === 0 ? 0 : Math.round(total / count)}`);
