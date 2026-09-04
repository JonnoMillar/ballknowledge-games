import { readFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import type { Player } from '../src/lib/chemistry/types';

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
// Stratified sample: famous, mid, deep — coverage may differ sharply by fame.
const sorted = [...pool].sort((a, b) => b.fame.value - a.fame.value);
const bands: Record<string, Player[]> = {
  'famous (top 500)': sorted.slice(0, 500),
  'mid (median band)': sorted.slice(5500, 6000),
  'deep cuts (bottom 500)': sorted.slice(-500),
};

for (const [label, group] of Object.entries(bands)) {
  const ids = group.slice(0, 400).map((p) => p.id);
  const q = `
SELECT (COUNT(DISTINCT ?p) AS ?withImage) WHERE {
  VALUES ?p { ${ids.map((i) => `wd:${i}`).join(' ')} }
  ?p wdt:P18 ?img .
}`.trim();
  const res = await runQuery(q);
  const n = Number(res.results.bindings[0]!['withImage']!.value);
  console.log(`${label.padEnd(24)} ${String(n).padStart(3)}/400  ${(100 * n / 400).toFixed(0)}% have a Commons photo`);
}
