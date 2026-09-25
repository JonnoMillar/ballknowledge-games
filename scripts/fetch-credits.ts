/**
 * Author and licence for every Commons photo the public site can show.
 *
 *   npm run fetch:credits    # -> data/credits.json, read by /credits
 *
 * Commons photos are CC BY / CC BY-SA / public domain, licensed per file, and
 * the BY licences need the author and the licence named. The set is computed
 * with the app's own portraitUrls in its public mode, so it cannot drift from
 * what a deployed page puts in a frame. Rerun after fetch:portraits.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { portraitUrls, type PortraitRecord } from '../src/lib/portraits';

const AGENT = 'RecallXI/0.1 (https://github.com/; jonno@m1llar.com)';
const OUT = 'data/credits.json';
const API = 'https://commons.wikimedia.org/w/api.php';

export interface Credit {
  artist: string;
  licence: string;
  licenceUrl?: string;
}

const images = JSON.parse(await readFile('data/images.json', 'utf8')) as Record<string, string>;
const portraits = JSON.parse(await readFile('data/portraits.json', 'utf8')) as Record<string, PortraitRecord>;

const FILEPATH = 'Special:FilePath/';
const files = new Set<string>();
for (const { url } of Object.values(portraitUrls(images, portraits))) {
  const at = url.indexOf(FILEPATH);
  if (at >= 0) files.add(decodeURIComponent(url.slice(at + FILEPATH.length).split('?')[0]!));
}
console.log(`${files.size} Commons files on public pages`);

/** Commons puts markup in Artist; the page wants the words. */
const text = (html = '') =>
  html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Reply {
  query?: {
    normalized?: { from: string; to: string }[];
    pages?: Record<string, {
      title: string;
      missing?: string;
      imageinfo?: { extmetadata?: Record<string, { value: string }> }[];
    }>;
  };
}

const credits: Record<string, Credit | null> = {};
const list = [...files];
for (let i = 0; i < list.length; i += 50) {
  const batch = list.slice(i, i + 50);
  const titles = batch.map((f) => `File:${f}`).join('|');
  const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=extmetadata`
    + `&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl&titles=${encodeURIComponent(titles)}`;
  let j: Reply | null = null;
  for (let t = 0; t < 4 && !j; t++) {
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } }).catch(() => null);
    if (r?.ok) j = (await r.json()) as Reply;
    else await sleep(2000 * (t + 1));
  }
  if (!j) throw new Error(`batch at ${i} failed four times`);

  // Titles come back normalised ("_" to " ", first letter capitalised); map
  // them back to the filename the app asked for.
  const asked = new Map(batch.map((f) => [`File:${f}`, f]));
  for (const n of j.query?.normalized ?? []) {
    const f = asked.get(n.from);
    if (f) asked.set(n.to, f);
  }
  for (const page of Object.values(j.query?.pages ?? {})) {
    const f = asked.get(page.title);
    if (!f) continue;
    const meta = page.imageinfo?.[0]?.extmetadata;
    credits[f] = page.missing !== undefined || !meta ? null : {
      artist: text(meta['Artist']?.value) || 'Unknown author',
      licence: text(meta['LicenseShortName']?.value) || 'See file page',
      licenceUrl: meta['LicenseUrl']?.value || undefined,
    };
  }
  process.stdout.write(`\r  ${Math.min(i + 50, list.length)}/${list.length}`);
  await sleep(200);
}

await writeFile(OUT, JSON.stringify(credits));
const missing = Object.values(credits).filter((c) => c === null).length;
console.log(`\n${Object.keys(credits).length} credited, ${missing} no longer on Commons`);
