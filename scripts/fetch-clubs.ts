import { readFile, writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { clubQuery } from '../src/pipeline/queries';
import type { Player } from '../src/lib/chemistry/types';

export interface ClubRecord {
  name: string;
  /** Commons filename. The app builds its own thumbnail URL from it. */
  badge?: string;
}

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const ids = [...new Set(pool.flatMap((p) => p.clubIds))];

const out: Record<string, ClubRecord> = {};
const CHUNK = 300;
for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await runQuery(clubQuery(ids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const qid = b['club']?.value.split('/').pop();
    if (!qid) continue;
    const name = b['name']?.value;
    // P154 first, P94 only as a fallback. See clubQuery.
    const file = b['logo']?.value ?? b['arms']?.value;
    const rec = out[qid] ?? { name: name ?? qid };
    if (name) rec.name = name;
    if (file && !rec.badge) rec.badge = decodeURIComponent(file.split('/').pop()!);
    out[qid] = rec;
  }
  console.log(`  ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}

await writeFile('data/clubs.json', JSON.stringify(out));
const withBadge = Object.values(out).filter((c) => c.badge).length;
const named = Object.values(out).filter((c) => c.name && !/^Q\d+$/.test(c.name)).length;
console.log(`\n${Object.keys(out).length} clubs`);
console.log(`  ${named} named (${Math.round((named / ids.length) * 100)}%)`);
console.log(`  ${withBadge} with a badge (${Math.round((withBadge / ids.length) * 100)}%)`);
