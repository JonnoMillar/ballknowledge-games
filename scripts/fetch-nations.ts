import { readFile, writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import type { Player } from '../src/lib/chemistry/types';

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const nations = [...new Set(pool.map((p) => p.nation))].filter((n) => n !== 'UNKNOWN');
console.log(`${nations.length} distinct nations in pool`);

const out: Record<string, string> = {};
const CHUNK = 300;
for (let i = 0; i < nations.length; i += CHUNK) {
  const values = nations.slice(i, i + CHUNK).map((q) => `wd:${q}`).join(' ');
  const res = await runQuery(`
SELECT ?n ?iso WHERE {
  VALUES ?n { ${values} }
  ?n wdt:P297 ?iso .
}`.trim());
  for (const b of res.results.bindings) {
    const q = b['n']?.value.split('/').pop();
    const iso = b['iso']?.value;
    if (q && iso) out[q] = iso;
  }
}

await writeFile('data/nations.json', JSON.stringify(out, null, 2));
const missing = nations.filter((n) => !out[n]);
console.log(`${Object.keys(out).length} mapped, ${missing.length} without an ISO code`);
if (missing.length) console.log(`  unmapped: ${missing.slice(0, 20).join(', ')}`);
