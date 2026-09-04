import { readFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import type { Player } from '../src/lib/chemistry/types';

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const uk = pool.filter((p) => p.nation === 'Q145');

// Do UK-national players carry P1532 (country for sport), which separates
// England / Scotland / Wales / N. Ireland the way football actually does?
const ids = uk.slice(0, 400).map((p) => p.id);
const res = await runQuery(`
SELECT ?p ?sportLabel WHERE {
  VALUES ?p { ${ids.map((i) => `wd:${i}`).join(' ')} }
  ?p wdt:P1532 ?sport .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
}`.trim());

const byNation = new Map<string, number>();
const seen = new Set<string>();
for (const b of res.results.bindings) {
  const p = b['p']!.value.split('/').pop()!;
  const n = b['sportLabel']?.value ?? '?';
  seen.add(p);
  byNation.set(n, (byNation.get(n) ?? 0) + 1);
}
console.log(`sampled ${ids.length} UK-national players`);
console.log(`${seen.size} have P1532 (${(100 * seen.size / ids.length).toFixed(0)}%)\n`);
for (const [n, c] of [...byNation.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(c).padStart(4)}  ${n}`);
}
