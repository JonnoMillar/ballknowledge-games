import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { normalise } from '../src/pipeline/normalise';
import { applyPoolFilters, DEFAULT_POOL_RULES } from '../src/pipeline/pool';
import { suspiciousName } from '../src/pipeline/sanity';
import { runQuery } from '../src/pipeline/sparql';
import { clubLeagueQuery } from '../src/pipeline/queries';
import type { SparqlBinding, SparqlResponse } from '../src/pipeline/sparql';

// Only batch files. `_ids.json` is a plain id array, not a SPARQL response.
const files = (await readdir('data/raw')).filter((f) => f.startsWith('batch-'));
if (files.length === 0) throw new Error('no batch files — run `npm run fetch:pool` first');

const bindings: SparqlBinding[] = [];
for (const f of files) {
  const parsed = JSON.parse(await readFile(`data/raw/${f}`, 'utf8')) as SparqlResponse;
  bindings.push(...parsed.results.bindings);
}
console.log(`${files.length} batches -> ${bindings.length} rows`);

const clubQids = [
  ...new Set(bindings.map((b) => b['club']?.value.split('/').pop()).filter(Boolean)),
] as string[];

// Chunked: a VALUES clause over every club times out. Spec 8.3.
const clubToLeague = new Map<string, string>();
const CHUNK = 400;
for (let i = 0; i < clubQids.length; i += CHUNK) {
  const res = await runQuery(clubLeagueQuery(clubQids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const club = b['club']?.value.split('/').pop();
    const league = b['league']?.value.split('/').pop();
    if (club && league) clubToLeague.set(club, league);
  }
  if (i % 2000 === 0) console.log(`  leagues ${Math.min(i + CHUNK, clubQids.length)}/${clubQids.length}`);
}
console.log(`resolved ${clubToLeague.size} of ${clubQids.length} clubs to a league`);

const raw = normalise(bindings, clubToLeague);
const pool = applyPoolFilters(raw, DEFAULT_POOL_RULES);

// Name sanity. Flag, never remove — a defaced name still belongs to a real
// player, so the fix is a manual override. Spec 8.2.
const flagged = pool
  .map((p) => ({ p, flag: suspiciousName(p.name) }))
  .filter((x) => x.flag !== null);

await mkdir('data', { recursive: true });
await writeFile('data/pool.json', JSON.stringify(pool));
await writeFile(
  'data/name-review.json',
  JSON.stringify(flagged.map((x) => ({ id: x.p.id, name: x.p.name, flag: x.flag })), null, 2),
);

console.log(`${raw.length} raw -> ${pool.length} in pool -> data/pool.json`);
console.log(`${flagged.length} names flagged for review -> data/name-review.json`);
