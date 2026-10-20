import { writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { runQuery } from '../src/pipeline/sparql';
import { eligiblePlayersQuery, undatedPlayersQuery, careersQuery } from '../src/pipeline/queries';
import { DEFAULT_POOL_RULES } from '../src/pipeline/pool';

const OUT = 'data/raw';
const IDS = `${OUT}/_ids.json`;
const UNDATED = `${OUT}/_ids-undated.json`;
const BATCH = 250;

await mkdir(OUT, { recursive: true });

// ---- Phase 1: eligible player ids (cached; ~60s) ----
let ids: string[];
if (existsSync(IDS)) {
  ids = JSON.parse(await readFile(IDS, 'utf8')) as string[];
  console.log(`phase 1: reusing cached ${ids.length} ids`);
} else {
  const r = DEFAULT_POOL_RULES;
  console.log(`phase 1: fetching eligible players (fame >= ${r.fameFloor}, era >= ${r.eraFrom})...`);
  const res = await runQuery(eligiblePlayersQuery(r.fameFloor, r.eraFrom));
  ids = [...new Set(res.results.bindings.map((b) => b['player']!.value.split('/').pop()!))];
  await writeFile(IDS, JSON.stringify(ids));
  console.log(`phase 1: ${ids.length} eligible players`);
}

// ---- Phase 1b: players with no dated club spell (cached; ~50s) ----
// Cached in its own file so an existing _ids.json gains them without a
// phase-1 refetch. Their era comes from the enwiki infobox. See
// undatedPlayersQuery.
let undated: string[];
if (existsSync(UNDATED)) {
  undated = JSON.parse(await readFile(UNDATED, 'utf8')) as string[];
  console.log(`phase 1b: reusing cached ${undated.length} undated ids`);
} else {
  console.log('phase 1b: fetching players with no dated club spell...');
  const res = await runQuery(undatedPlayersQuery(DEFAULT_POOL_RULES.fameFloor));
  undated = [...new Set(res.results.bindings.map((b) => b['player']!.value.split('/').pop()!))];
  await writeFile(UNDATED, JSON.stringify(undated));
  console.log(`phase 1b: ${undated.length} undated players`);
}
const before = ids.length;
ids = [...new Set([...ids, ...undated])];
// _ids.json is every candidate: the side-file fetchers read it.
if (ids.length > before) await writeFile(IDS, JSON.stringify(ids));

// ---- Phase 2: careers, in resumable batches ----
// Resumes by coverage, not by batch index: any id no batch file has asked
// for yet is fetched, so ids added to phase 1 (or dropped from an older
// batch by a since-changed query) are picked up without refetching the rest.
// Delete data/raw to refetch everything.
const existing = (await readdir(OUT)).filter((f) => f.startsWith('batch-')).sort();
const covered = new Set<string>();
for (const f of existing) {
  const b = JSON.parse(await readFile(`${OUT}/${f}`, 'utf8')) as { asked?: string[]; results: { bindings: { player?: { value: string } }[] } };
  // Older batches record no `asked`; for them, only the players they returned.
  for (const id of b.asked ?? b.results.bindings.map((r) => r.player!.value.split('/').pop()!)) covered.add(id);
}
const todo = ids.filter((id) => !covered.has(id));
const next = existing.length ? Number(existing.at(-1)!.slice(6, 10)) + 1 : 0;
const total = Math.ceil(todo.length / BATCH);
console.log(`phase 2: ${covered.size} ids covered by ${existing.length} batch files, ${todo.length} to fetch`);
let fetched = 0;

for (let i = 0; i < todo.length; i += BATCH) {
  const n = i / BATCH;
  const file = `${OUT}/batch-${String(next + n).padStart(4, '0')}.json`;
  const chunk = todo.slice(i, i + BATCH);
  let attempt = 0;
  for (;;) {
    try {
      const res = await runQuery(careersQuery(chunk));
      await writeFile(file, JSON.stringify({ asked: chunk, ...res }));
      fetched++;
      console.log(`  batch ${n + 1}/${total}  ${res.results.bindings.length} rows`);
      break;
    } catch (e) {
      attempt++;
      if (attempt >= 3) { console.log(`  batch ${n + 1}: GAVE UP — ${(e as Error).message}`); break; }
      const wait = attempt * 5000;
      console.log(`  batch ${n + 1}: retry ${attempt} in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

const files = (await readdir(OUT)).filter((f) => f.startsWith('batch-'));
console.log(`\nphase 2: ${fetched} fetched, ${files.length} batch files total`);
