import { readFile, readdir } from 'node:fs/promises';
import { normalise } from '../src/pipeline/normalise';
import { applyPoolFilters, DEFAULT_POOL_RULES } from '../src/pipeline/pool';
import type { SparqlBinding, SparqlResponse } from '../src/pipeline/sparql';
import type { Player } from '../src/lib/chemistry/types';

const CLUB_NAMES: Record<string, string> = {
  Q8682: 'Real Madrid', Q18732: 'Southampton',
  Q134241: 'Feyenoord', Q19467: 'Crystal Palace',
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
}

// ---- attrition: which filter removes what ----
const files = (await readdir('data/raw')).filter((f) => f.endsWith('.json'));
const bindings: SparqlBinding[] = [];
for (const f of files) {
  const parsed = JSON.parse(await readFile(`data/raw/${f}`, 'utf8')) as SparqlResponse;
  bindings.push(...parsed.results.bindings);
}
const raw = normalise(bindings, new Map());

const r = DEFAULT_POOL_RULES;
const noPos = raw.filter((p) => p.positions.length === 0).length;
const noDates = raw.filter((p) => p.clubs.every((c) => c.from === null)).length;
const belowFame = raw.filter((p) => p.sitelinks < r.fameFloor).length;
const preEra = raw.filter((p) => {
  const y = p.clubs.map((c) => c.from).filter((v): v is number => v !== null);
  return y.length > 0 && Math.max(...y) < r.eraFrom;
}).length;

console.log('=== FILTER ATTRITION (overlapping, not additive) ===');
console.log(`raw players               ${raw.length}`);
console.log(`  no position class       ${noPos}   <- P413 missing or unmapped`);
console.log(`  no dated spell          ${noDates}`);
console.log(`  below fame floor (${r.fameFloor})   ${belowFame}`);
console.log(`  pre-era (<${r.eraFrom})         ${preEra}`);

// ---- per-club fame distribution ----
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const byClub = new Map<string, Player[]>();
for (const p of pool) {
  for (const c of p.clubIds) {
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p);
  }
}

console.log('\n=== FAME DISTRIBUTION BY CLUB ===');
console.log('club              n    min  p25  med  p75  max   deep(<=30)  famous(>=80)');
for (const qid of Object.keys(CLUB_NAMES)) {
  const players = byClub.get(qid) ?? [];
  if (players.length === 0) { console.log(`${CLUB_NAMES[qid]!.padEnd(16)} (none)`); continue; }
  const f = players.map((p) => p.fame.value).sort((a, b) => a - b);
  console.log(
    CLUB_NAMES[qid]!.padEnd(16),
    String(players.length).padStart(4),
    String(f[0] ?? 0).padStart(5),
    String(percentile(f, 0.25)).padStart(4),
    String(percentile(f, 0.5)).padStart(4),
    String(percentile(f, 0.75)).padStart(4),
    String(f[f.length - 1] ?? 0).padStart(5),
    String(players.filter((p) => p.fame.value <= 30).length).padStart(11),
    String(players.filter((p) => p.fame.value >= 80).length).padStart(13),
  );
}

console.log('\n=== THE 15 MOST OBSCURE IN EACH CLUB (read these aloud) ===');
for (const qid of Object.keys(CLUB_NAMES)) {
  const players = (byClub.get(qid) ?? []).slice().sort((a, b) => a.fame.value - b.fame.value);
  if (players.length === 0) continue;
  console.log(`\n--- ${CLUB_NAMES[qid]} ---`);
  for (const p of players.slice(0, 15)) {
    console.log(`  ${String(p.fame.value).padStart(4)}  ${p.name}`);
  }
}

console.log(`\ntotal pool: ${pool.length}`);
