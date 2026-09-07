import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { runQuery } from '../src/pipeline/sparql';
import type { Player } from '../src/lib/chemistry/types';
import type { ClubRecord } from '../src/lib/clubs';

/**
 * Fetch club crests from ENGLISH WIKIPEDIA, not from Wikidata.
 *
 * Usage: tsx scripts/fetch-club-badges.ts [--download]
 *
 * WHY NOT WIKIDATA. P154 ("logo image") is the obvious property and it is
 * nearly empty for football: 2,020 of 41,413 association football clubs carry
 * one, 4.9%. Manchester United, Manchester City, Real Madrid, Arsenal and
 * Chelsea have no P154 at all — not even a deprecated statement. What they do
 * have is P18, and P18 is a photograph: Real Madrid's is a building, City's is
 * the Etihad. Wikidata's images come from Wikimedia Commons, and Commons will
 * not host a copyrighted club crest.
 *
 * WHY ENWIKI HAS THEM ANYWAY. English Wikipedia keeps crests as LOCAL non-free
 * files under /wikipedia/en/ rather than /wikipedia/commons/, uploaded under a
 * fair-use rationale. They are absent from Wikidata and invisible to the
 * PageImages API (which filters non-free files out, which is why an earlier
 * attempt through that API also came back empty), but they sit in the infobox
 * of every club article and the imageinfo API resolves them like any other file.
 *
 * So the route is: club QID -> enwiki sitelink -> infobox image parameter ->
 * imageinfo -> thumbnail URL. Three hops instead of one property, and it is the
 * only free route that reaches the clubs anyone has heard of.
 *
 * LICENSING, STATED ONCE. Files under /wikipedia/en/ are non-free. Wikipedia's
 * own fair-use rationale covers use on Wikipedia, not reuse in an app, and the
 * underlying crests are trademarks besides. Commons-hosted crests (Boca
 * Juniors, Bayern) are unencumbered; the English local ones are not.
 */
const AGENT = 'RecallXI/0.1 (https://github.com/; jonno@m1llar.com)';
const WIDTH = Number(process.env.WIDTH ?? 96);
const DOWNLOAD = process.argv.includes('--download');
const LIMIT = Number(process.env.LIMIT ?? 0);

const api = 'https://en.wikipedia.org/w/api.php';

async function wiki(params: Record<string, string>): Promise<any> {
  const url = `${api}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (res.ok) return res.json();
    // 429 and 5xx are the two the API actually returns under load.
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  throw new Error(`wiki API failed: ${JSON.stringify(params).slice(0, 120)}`);
}

/**
 * Pull the crest filename out of an article's infobox.
 *
 * Only the head of the article is searched. Further down a club article are
 * kit images, stadium photographs and honours tables, and the first `image =`
 * after the infobox is rarely a crest.
 */
function crestFrom(wikitext: string): string | null {
  const head = wikitext.slice(0, 5000);
  for (const m of head.matchAll(/\|\s*(?:image|logo|crest|badge)\s*=\s*([^\n]*)/gi)) {
    const file = m[1]?.match(/([^|[\]{}=<>\n]+\.(?:svg|png|jpg|jpeg|gif))/i);
    if (file) return file[1]!.replace(/^\s*File:/i, '').trim();
  }
  return null;
}

const chunk = <T,>(xs: readonly T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;

// Busiest clubs first, so a LIMIT run measures the clubs that actually turn up
// in puzzles rather than a random tail of third-tier sides.
const counts = new Map<string, number>();
for (const p of pool) for (const id of p.clubIds) counts.set(id, (counts.get(id) ?? 0) + 1);
let ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
if (LIMIT) ids = ids.slice(0, LIMIT);

// ---- 1. QID -> English Wikipedia article title -------------------------------
const titleOf = new Map<string, string>();
for (const [i, part] of chunk(ids, 400).entries()) {
  const values = part.map((q) => `wd:${q}`).join(' ');
  const res = await runQuery(`
SELECT ?club ?title WHERE {
  VALUES ?club { ${values} }
  ?sitelink schema:about ?club ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
}`);
  for (const b of res.results.bindings) {
    const qid = b['club']?.value.split('/').pop();
    const title = b['title']?.value;
    if (qid && title) titleOf.set(qid, title);
  }
  process.stdout.write(`\r  sitelinks ${Math.min((i + 1) * 400, ids.length)}/${ids.length}`);
}
console.log(`\n  ${titleOf.size} of ${ids.length} clubs have an English article`);

// ---- 2. Article title -> infobox filename ------------------------------------
const qidOfTitle = new Map<string, string>();
for (const [qid, t] of titleOf) qidOfTitle.set(t, qid);

const fileOf = new Map<string, string>();
const titles = [...titleOf.values()];
for (const [i, part] of chunk(titles, 50).entries()) {
  const res = await wiki({
    action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main',
    redirects: '1', titles: part.join('|'),
  });
  // A redirect changes the title, so the response has to be mapped back to the
  // requested one before it can be matched to a QID.
  const back = new Map<string, string>();
  for (const r of [...(res.query?.normalized ?? []), ...(res.query?.redirects ?? [])]) {
    back.set(r.to, back.get(r.from) ?? r.from);
  }
  for (const page of Object.values<any>(res.query?.pages ?? {})) {
    const original = back.get(page.title) ?? page.title;
    const qid = qidOfTitle.get(original) ?? qidOfTitle.get(page.title);
    const text = page.revisions?.[0]?.slots?.main?.['*'];
    if (!qid || !text) continue;
    const file = crestFrom(text);
    if (file) fileOf.set(qid, file);
  }
  process.stdout.write(`\r  infoboxes ${Math.min((i + 1) * 50, titles.length)}/${titles.length}`);
}
console.log(`\n  ${fileOf.size} crest filenames found`);

// ---- 3. Filename -> thumbnail URL --------------------------------------------
const urlOf = new Map<string, { url: string; source: 'commons' | 'en' }>();
const files = [...new Set(fileOf.values())];
for (const [i, part] of chunk(files, 50).entries()) {
  const res = await wiki({
    action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(WIDTH),
    titles: part.map((f) => `File:${f}`).join('|'),
  });
  for (const page of Object.values<any>(res.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    // The API appends utm_source/utm_campaign tracking to every URL. It is a
    // third of the string and means nothing to us.
    const url: string = (info.thumburl ?? info.url).split('?')[0];
    const name = page.title.replace(/^File:/, '');
    urlOf.set(name, { url, source: url.includes('/wikipedia/commons/') ? 'commons' : 'en' });
  }
  process.stdout.write(`\r  urls ${Math.min((i + 1) * 50, files.length)}/${files.length}`);
}
console.log(`\n  ${urlOf.size} of ${files.length} files resolved`);

// ---- 4. Record what was found, BEFORE downloading anything -------------------
// The first version of this script downloaded first and saved once at the end.
// A dropped socket 900 files in took the whole run with it, including fifteen
// minutes of API work that had already succeeded. Metadata is the expensive
// part; it gets written as soon as it exists.
for (const [qid, file] of fileOf) {
  // Titles are normalised with underscores; the API echoes spaces back.
  const hit = urlOf.get(file) ?? urlOf.get(file.replace(/_/g, ' '));
  if (!hit) continue;
  const rec = clubs[qid] ?? { name: qid };
  rec.crestUrl = hit.url;
  rec.crestSource = hit.source;
  clubs[qid] = rec;
}
await writeFile('data/clubs.json', JSON.stringify(clubs));

// ---- 5. Optionally pull the images down --------------------------------------
let bytes = 0;
let saved = 0;
if (DOWNLOAD) {
  await mkdir('public/badges', { recursive: true });
  const todo = Object.entries(clubs).filter(([, c]) => c.crestUrl);
  for (const [i, [qid, rec]] of todo.entries()) {
    const path = `public/badges/${qid}.png`;
    // Resumable: a re-run after a network drop picks up where it stopped.
    if (existsSync(path)) {
      rec.crest = `${qid}.png`;
      bytes += statSync(path).size;
      saved++;
      continue;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(rec.crestUrl!, { headers: { 'User-Agent': AGENT } });
        if (!res.ok) break;
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(path, buf);
        rec.crest = `${qid}.png`;
        bytes += buf.length;
        saved++;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
    if (i % 200 === 0) {
      await writeFile('data/clubs.json', JSON.stringify(clubs));
      process.stdout.write(`\r  downloaded ${saved}/${todo.length}`);
    }
  }
  await writeFile('data/clubs.json', JSON.stringify(clubs));
}

const withUrl = Object.values(clubs).filter((c) => c.crestUrl).length;
const free = Object.values(clubs).filter((c) => c.crestSource === 'commons').length;
console.log(`\n\n${ids.length} clubs asked for`);
console.log(`  ${withUrl} with a crest (${Math.round((withUrl / ids.length) * 100)}%)`);
console.log(`  ${free} of those from Commons, ${withUrl - free} non-free enwiki files`);
if (DOWNLOAD) console.log(`  ${saved} downloaded, ${(bytes / 1e6).toFixed(1)} MB at ${WIDTH}px`);
