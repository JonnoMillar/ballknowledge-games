import { readFile, writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { genderQuery } from '../src/pipeline/queries';

const ids = JSON.parse(await readFile('data/raw/_ids.json', 'utf8')) as string[];
const out: Record<string, string> = {};
const CHUNK = 500;
for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await runQuery(genderQuery(ids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const p = b['player']?.value.split('/').pop();
    const g = b['gender']?.value.split('/').pop();
    if (p && g) out[p] = g;
  }
  if (i % 2500 === 0) console.log(`  ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}
await writeFile('data/raw/_gender.json', JSON.stringify(out));
const male = Object.values(out).filter((g) => g === 'Q6581097').length;
const female = Object.values(out).filter((g) => g === 'Q6581072').length;
console.log(`\n${Object.keys(out).length} resolved: ${male} male, ${female} female, ${Object.keys(out).length - male - female} other/unknown`);
