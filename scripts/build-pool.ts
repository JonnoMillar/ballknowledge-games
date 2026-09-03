import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { normalise } from '../src/pipeline/normalise';
import { applyPoolFilters, DEFAULT_POOL_RULES } from '../src/pipeline/pool';
import { runQuery } from '../src/pipeline/sparql';
import { clubLeagueQuery } from '../src/pipeline/queries';
import type { SparqlBinding, SparqlResponse } from '../src/pipeline/sparql';

const files = (await readdir('data/raw')).filter((f) => f.endsWith('.json'));
const bindings: SparqlBinding[] = [];
for (const f of files) {
  const parsed = JSON.parse(await readFile(`data/raw/${f}`, 'utf8')) as SparqlResponse;
  bindings.push(...parsed.results.bindings);
}

const clubQids = [
  ...new Set(bindings.map((b) => b['club']?.value.split('/').pop()).filter(Boolean)),
] as string[];

// Chunked: a VALUES clause with thousands of entries times out. Spec 8.3.
const clubToLeague = new Map<string, string>();
const CHUNK = 400;
for (let i = 0; i < clubQids.length; i += CHUNK) {
  const chunk = clubQids.slice(i, i + CHUNK);
  const res = await runQuery(clubLeagueQuery(chunk));
  for (const b of res.results.bindings) {
    const club = b['club']?.value.split('/').pop();
    const league = b['league']?.value.split('/').pop();
    if (club && league) clubToLeague.set(club, league);
  }
  console.log(`  leagues ${Math.min(i + CHUNK, clubQids.length)}/${clubQids.length}`);
}

const raw = normalise(bindings, clubToLeague);
const pool = applyPoolFilters(raw, DEFAULT_POOL_RULES);

await mkdir('data', { recursive: true });
await writeFile('data/pool.json', JSON.stringify(pool, null, 2));
console.log(`${raw.length} raw -> ${pool.length} in pool -> data/pool.json`);
