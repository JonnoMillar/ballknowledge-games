import { writeFile, mkdir } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { clubRosterQuery } from '../src/pipeline/queries';

const clubQid = process.argv[2];
if (!clubQid) {
  console.error('usage: npm run fetch:club -- <clubQid>   e.g. Q8682');
  process.exit(1);
}

const res = await runQuery(clubRosterQuery(clubQid));
await mkdir('data/raw', { recursive: true });
await writeFile(`data/raw/${clubQid}.json`, JSON.stringify(res, null, 2));
console.log(`${clubQid}: ${res.results.bindings.length} rows -> data/raw/${clubQid}.json`);
