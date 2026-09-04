import { writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { runQuery } from '../src/pipeline/sparql';
import { eligiblePlayersQuery, careersQuery } from '../src/pipeline/queries';
import { DEFAULT_POOL_RULES } from '../src/pipeline/pool';

const OUT = 'data/raw';
const IDS = `${OUT}/_ids.json`;
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

// ---- Phase 2: careers, in resumable batches ----
const total = Math.ceil(ids.length / BATCH);
let fetched = 0;
let skipped = 0;

for (let i = 0; i < ids.length; i += BATCH) {
  const n = Math.floor(i / BATCH);
  const file = `${OUT}/batch-${String(n).padStart(4, '0')}.json`;
  if (existsSync(file)) { skipped++; continue; }

  const chunk = ids.slice(i, i + BATCH);
  let attempt = 0;
  for (;;) {
    try {
      const res = await runQuery(careersQuery(chunk));
      await writeFile(file, JSON.stringify(res));
      fetched++;
      if (n % 5 === 0 || n === total - 1) {
        console.log(`  batch ${n + 1}/${total}  ${res.results.bindings.length} rows`);
      }
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
console.log(`\nphase 2: ${fetched} fetched, ${skipped} already present, ${files.length} batch files total`);
