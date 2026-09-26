/**
 * Names that disagree with the player's English Wikipedia title and
 * multilingual label, live from Wikidata.
 *
 *   npm run review:labels    # ~12 minutes, one request a second
 *
 * The heuristics in src/pipeline/sanity.ts catch "EL GOAT"; they cannot catch
 * "Juan Mata Pata", or Marc Bartra relabelled "Ronaldo". This can: a defaced
 * English label rarely agrees with both the article title and the `mul`
 * label. It skips names that match the title, then prints only the strong
 * signals, a `mul` label that differs or a short name sharing no word with
 * the title; full legal names, nicknames and transliterations make up most
 * other disagreements and are fine. Confirm
 * each by the player's clubs before adding it to src/pipeline/overrides.ts.
 */
import { readFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';
import type { ClubRecord } from '../src/lib/clubs';

const AGENT = 'RecallXI/0.1 (https://github.com/; jonno@m1llar.com)';
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s*\(.*?\)\s*/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Entity { labels?: { mul?: { value: string } }; sitelinks?: { enwiki?: { title: string } } }

async function entities(ids: string[]): Promise<Record<string, Entity>> {
  const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|sitelinks'
    + `&languages=mul&sitefilter=enwiki&ids=${ids.join('|')}`;
  for (let t = 0; t < 6; t++) {
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } }).catch(() => null);
    const text = r ? await r.text() : '';
    try { return (JSON.parse(text) as { entities: Record<string, Entity> }).entities; } catch { await sleep(5000 * (t + 1)); }
  }
  throw new Error(`Wikidata refused the batch starting ${ids[0]}`);
}

let flagged = 0;
for (let i = 0; i < pool.length; i += 50) {
  const batch = pool.slice(i, i + 50);
  const got = await entities(batch.map((p) => p.id));
  for (const p of batch) {
    const title = got[p.id]?.sitelinks?.enwiki?.title;
    const mul = got[p.id]?.labels?.mul?.value;
    // Agreeing with the article title is enough: `mul` labels are often in
    // the player's own script, and are defaced as often as English ones.
    if (title !== undefined && fold(title) === fold(p.name)) continue;
    const name = fold(p.name).split(' ');
    const words = title ? fold(title).split(' ') : [];
    const mulDiffers = mul !== undefined && fold(mul) !== fold(p.name);
    const noCommonWord = mul === undefined && title !== undefined && name.length <= 2 && !name.some((w) => words.includes(w));
    if (!mulDiffers && !noCommonWord) continue;
    flagged++;
    const at = p.clubIds.slice(0, 3).map((c) => clubs[c]?.name ?? c).join(', ');
    console.log(`${p.id.padEnd(11)} ${JSON.stringify(p.name)}  enwiki ${JSON.stringify(title)}  mul ${JSON.stringify(mul)}  (${at})`);
  }
  await sleep(1000);
}
console.log(`\n${flagged} to review by hand`);
