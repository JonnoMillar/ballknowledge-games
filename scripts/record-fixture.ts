import { writeFile, mkdir } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { clubRosterQuery } from '../src/pipeline/queries';

// Real Madrid is the fixture club: it contains all three traps at once —
// Mbappe (mul label + preferred rank) and Julio Iglesias (contamination).
const res = await runQuery(clubRosterQuery('Q8682'));
await mkdir('tests/fixtures', { recursive: true });
await writeFile('tests/fixtures/Q8682.json', JSON.stringify(res, null, 2));
console.log(`recorded ${res.results.bindings.length} rows -> tests/fixtures/Q8682.json`);
