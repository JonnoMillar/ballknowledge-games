import { writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { famousElsewhereQuery } from '../src/pipeline/queries';
import { pendingIds } from './pending-ids';

/**
 * Which candidates are famous for something other than football (a singer, a
 * cyclist, an NFL receiver) and have no recorded appearance for a football
 * club -> data/raw/_elsewhere.json, id -> true | false. build-pool drops the
 * trues. The rule and its measurements are at FAMOUS_ELSEWHERE.
 */
const { ids, done } = await pendingIds<boolean>('data/raw/_elsewhere.json');
const out: Record<string, boolean> = { ...done };
// Small batches, saved as they land, so a run that dies keeps what it has.
const CHUNK = 100;
for (let i = 0; i < ids.length; i += CHUNK) {
  const chunk = ids.slice(i, i + CHUNK);
  const res = await runQuery(famousElsewhereQuery(chunk));
  const hit = new Set(res.results.bindings.map((b) => b['player']!.value.split('/').pop()!));
  for (const id of chunk) out[id] = hit.has(id);
  await writeFile('data/raw/_elsewhere.json', JSON.stringify(out));   // resumable
  if (i % 2000 === 0) console.log(`  ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}
await writeFile('data/raw/_elsewhere.json', JSON.stringify(out));
console.log(`\n${Object.values(out).filter(Boolean).length} of ${Object.keys(out).length} famous for something else`);
