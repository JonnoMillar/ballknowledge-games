import { readFile, writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { sportNationQuery } from '../src/pipeline/queries';

const ids = JSON.parse(await readFile('data/raw/_ids.json', 'utf8')) as string[];
const out: Record<string, string> = {};
const CHUNK = 400;
for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await runQuery(sportNationQuery(ids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const p = b['player']?.value.split('/').pop();
    const s = b['sport']?.value.split('/').pop();
    // First value wins: a few players list more than one eligibility.
    if (p && s && !out[p]) out[p] = s;
  }
  if (i % 2400 === 0) console.log(`  ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}
await writeFile('data/raw/_sportnation.json', JSON.stringify(out));
console.log(`\n${Object.keys(out).length} of ${ids.length} have a sporting nationality`);
