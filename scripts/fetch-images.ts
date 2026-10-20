import { writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { imageQuery } from '../src/pipeline/queries';
import { pendingIds } from './pending-ids';

const { ids, done } = await pendingIds<string>('data/images.json');
const out: Record<string, string> = { ...done };
const CHUNK = 400;
for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await runQuery(imageQuery(ids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const p = b['player']?.value.split('/').pop();
    const url = b['img']?.value;
    if (!p || !url || out[p]) continue;
    // Store the Commons FILENAME only. The app builds a thumbnail URL from it,
    // so the width is ours to choose and we never ship a full-size original.
    out[p] = decodeURIComponent(url.split('/').pop()!);
  }
  if (i % 2400 === 0) console.log(`  ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}
await writeFile('data/images.json', JSON.stringify(out));
console.log(`\n${Object.keys(out).length} players have a Commons photo`);
