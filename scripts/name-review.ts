import { readFile } from 'node:fs/promises';
import { suspiciousName } from '../src/pipeline/sanity';
import type { Player } from '../src/lib/chemistry/types';

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const flagged = pool
  .map((p) => ({ id: p.id, name: p.name, flag: suspiciousName(p.name) }))
  .filter((x) => x.flag !== null);

console.log(`${flagged.length} of ${pool.length} names flagged for review`);
for (const f of flagged) {
  console.log(`  ${f.flag!.padEnd(12)} ${f.id.padEnd(11)} ${JSON.stringify(f.name)}`);
}
if (flagged.length === 0) console.log('  (none)');
