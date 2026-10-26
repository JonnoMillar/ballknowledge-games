import { readFile, writeFile, readdir } from 'node:fs/promises';
import { chainFieldFor } from '../src/lib/chain/score';
import type { ChainPuzzle } from '../src/lib/chain/types';
import type { Player } from '../src/lib/chemistry/types';
import { buildWorld } from '../games/itk/lib/world';
import { readInputs } from './itk/inputs';
import { endsOf, fieldOf, stepsOf, type Ruler, type Views } from '../games/step/lib/rules';
import type { StoredDay } from '../games/step/lib/day';

/**
 * Resolve a PORTRAIT for every player a shipped board can put on screen.
 *
 * Usage: tsx scripts/fetch-portraits.ts [--all | --itk | --step]
 *
 * The problem this exists to solve: 31% of the Commons photos in
 * data/images.json were taken AFTER the player retired, so the frame shows a
 * pundit in a suit or a manager in a coat rather than a footballer. Measured
 * over a 300-player sample.
 *
 * Two sources, in order.
 *
 * 1. TheSportsDB's `strCutout` — a square, transparent, in-kit head and
 *    shoulders. It solves era, crop and aspect ratio in one asset, and it
 *    carries no watermark (checked by downloading four of them; the claim that
 *    it does appears to be wrong). Free tier, key 123, 30 requests a minute.
 *    `strThumb` is NOT used: it is an ordinary press photo and carries exactly
 *    the era problem we are here to fix — Mark Robins' is captioned
 *    "Coventry City's manager" in its own EXIF.
 *
 * 2. A Commons photo whose capture date falls inside the player's career.
 *    Dates come from `extmetadata.DateTimeOriginal`, available for 98% of
 *    files; career spans come from P580/P582 in data/raw, which survive there
 *    for effectively every player even though pool.json drops them. When the
 *    photo we already hold is out of era, the player's Commons category is
 *    crawled for one that is not — categories exist for 93% of retired players
 *    and hold an in-career photo 85% of the time, at 11.4 files each.
 *
 * Licensing, so it is on the record: cutouts carry no `strCreativeCommons`
 * flag, and TheSportsDB's terms (checked 2026-09-25) say artwork with a
 * missing flag "must not be used ... publicly, including ... websites".
 * So a cutout is for local development only, and every cutout record also
 * carries `alt`, an in-era Commons photo the public build shows instead
 * (`npm run fetch:portraits -- --alts`). Commons files are licensed per file
 * and credited on /credits (see scripts/fetch-credits.ts).
 *
 * Resumable. Results are written after every player, because a dropped socket
 * once cost this project 900 successful calls made before a single save.
 */
const KEY = process.env.TSDB_KEY ?? '123';
const AGENT = 'RecallXI/0.1 (https://github.com/; jonno@m1llar.com)';
const OUT = 'data/portraits.json';
const ALL = process.argv.includes('--all');
const ALTS = process.argv.includes('--alts');

/** Free tier is 30/min. Sit under it rather than on it. */
const GAP = Number(process.env.GAP ?? 2200);

interface Portrait {
  /** Where the image came from, or why there is none. */
  source: 'cutout' | 'commons' | 'none';
  url?: string;
  /** Commons only: the capture year we accepted it on. */
  year?: number;
  /** Career span used to judge the era, for auditing a bad call later. */
  career?: [number, number];
  /** Why a player has no portrait: which step failed. */
  reason?: string;
  /** Cutouts only: the in-era Commons photo shown where the cutout may not be. */
  alt?: { url: string; year: number } | null;
}

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const images = JSON.parse(await readFile('data/images.json', 'utf8')) as Record<string, string>;
const byId = new Map(pool.map((p) => [p.id, p]));

// ---------------------------------------------------------------- which players

/**
 * Everyone a shipped board can put on screen: the givens, and every player who
 * would have satisfied a blank — because the reveal shows the field, not just
 * the pick. Computed with the game's own rule so it cannot drift from what the
 * board will actually accept.
 */
async function required(): Promise<Set<string>> {
  const ids = new Set<string>();
  const files = (await readdir('content/chains')).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const chain = JSON.parse(await readFile(`content/chains/${f}`, 'utf8')) as ChainPuzzle;
    const mode = chain.mode ?? 'chemistry';
    for (const id of chain.slots) if (id) ids.add(id);
    chain.slots.forEach((slot, i) => {
      if (slot !== null) return;
      for (const p of chainFieldFor(i, chain.slots, pool, byId, mode, chain.prescribedLinks, chain.closed)) {
        ids.add(p.id);
      }
    });
  }
  return ids;
}

// ------------------------------------------------------------------- careers

/**
 * First and last year of a playing career, from the P580/P582 qualifiers that
 * pool.json drops but data/raw keeps. Youth spells are included: they bound the
 * era correctly even though nobody would call them the career.
 */
async function careers(): Promise<Map<string, [number, number]>> {
  const out = new Map<string, [number, number]>();
  for (const f of (await readdir('data/raw')).filter((n) => n.startsWith('batch-'))) {
    const j = JSON.parse(await readFile(`data/raw/${f}`, 'utf8')) as {
      results: { bindings: Record<string, { value: string }>[] };
    };
    for (const b of j.results.bindings) {
      const id = b['player']?.value.split('/').pop();
      if (!id) continue;
      for (const key of ['start', 'end'] as const) {
        const y = Number(b[key]?.value.slice(0, 4));
        if (!y) continue;
        const cur = out.get(id);
        out.set(id, cur ? [Math.min(cur[0], y), Math.max(cur[1], y)] : [y, y]);
      }
    }
  }
  // Wikidata's qualifiers stop mid-career for a third of the pool (Valverde
  // "ends" in 2018). The merged pool knows when each spell ended, so it can
  // only push the end later, never earlier.
  for (const p of pool) {
    const cur = out.get(p.id);
    const last = Math.max(0, ...Object.values(p.spells ?? {}).map((s) => s[2] ?? 0));
    if (cur && last > cur[1]) out.set(p.id, [cur[0], last]);
  }
  return out;
}

// ---------------------------------------------------------------------- http

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function json<T>(url: string, tries = 3): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
      if (r.status === 429) { await sleep(5000 * (i + 1)); continue; }
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      await sleep(1200 * (i + 1));
    }
  }
  return null;
}

// -------------------------------------------------------------- thesportsdb

interface TsdbPlayer { strSport?: string; strCutout?: string | null }

async function cutout(name: string): Promise<string | null> {
  const url = `https://www.thesportsdb.com/api/v1/json/${KEY}/searchplayers.php?p=${encodeURIComponent(name)}`;
  const j = await json<{ player: TsdbPlayer[] | null }>(url);
  const hit = (j?.player ?? []).find((p) => p.strSport === 'Soccer' && p.strCutout);
  return hit?.strCutout ?? null;
}

// ------------------------------------------------------------------ commons

const COMMONS = 'https://commons.wikimedia.org/w/api.php';

/** Capture year of a Commons file, from EXIF where the uploader preserved it. */
async function shotIn(file: string): Promise<number | null> {
  const url = `${COMMONS}?action=query&format=json&prop=imageinfo&iiprop=extmetadata`
    + `&titles=${encodeURIComponent(`File:${file}`)}`;
  const j = await json<{
    query?: { pages?: Record<string, { imageinfo?: { extmetadata?: Record<string, { value: string }> }[] }> };
  }>(url);
  const meta = Object.values(j?.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata;
  const raw = meta?.['DateTimeOriginal']?.value ?? meta?.['DateTime']?.value;
  const year = Number(String(raw ?? '').match(/\b(1[89]\d\d|20\d\d)\b/)?.[1]);
  return year || null;
}

/** The player's Commons category, if Wikidata records one (P373). */
async function category(id: string): Promise<string | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${id}&property=P373`;
  const j = await json<{ claims?: { P373?: { mainsnak?: { datavalue?: { value?: string } } }[] } }>(url);
  return j?.claims?.P373?.[0]?.mainsnak?.datavalue?.value ?? null;
}

/** Subcategories of a Commons category. */
async function subcategories(cat: string): Promise<string[]> {
  const url = `${COMMONS}?action=query&format=json&list=categorymembers&cmtype=subcat&cmlimit=200`
    + `&cmtitle=${encodeURIComponent(`Category:${cat}`)}`;
  const j = await json<{ query?: { categorymembers?: { title: string }[] } }>(url);
  return (j?.query?.categorymembers ?? []).map((m) => m.title.replace(/^Category:/, ''));
}

/**
 * A famous player's photos are often filed by year, two levels down
 * ("Andrés Iniesta by year" > "Andrés Iniesta in 2010"), not in his own
 * category. The year subcategories inside the career, latest first.
 */
async function yearCategories(cat: string, span: [number, number]): Promise<string[]> {
  const subs = await subcategories(cat);
  for (const s of subs.filter((x) => /by year/i.test(x))) subs.push(...await subcategories(s));
  return subs
    .map((s) => ({ s, y: Number(s.match(/\b(19|20)\d\d\b/)?.[0]) }))
    .filter(({ y }) => y >= span[0] && y <= span[1])
    .sort((a, b) => b.y - a.y)
    .map(({ s }) => s);
}

/** Image files in a Commons category, in the category's own sort order. */
async function categoryFiles(cat: string): Promise<string[]> {
  const url = `${COMMONS}?action=query&format=json&list=categorymembers&cmtype=file&cmlimit=200`
    + `&cmtitle=${encodeURIComponent(`Category:${cat}`)}`;
  const j = await json<{ query?: { categorymembers?: { title: string }[] } }>(url);
  return (j?.query?.categorymembers ?? [])
    .map((m) => m.title.replace(/^File:/, ''))
    .filter((f) => /\.(jpe?g|png)$/i.test(f));
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');

const PARTICLES = new Set(['van', 'der', 'den', 'von', 'dos', 'das', 'del', 'des', 'bin', 'ibn']);

const nameParts = (name: string) => fold(name).split(' ').filter((t) => t.length >= 3 && !PARTICLES.has(t));

/** Does the filename carry a real part of the player's name ("eto" for Eto'o, not "van")? */
const namesPlayer = (file: string, name: string) => {
  const f = fold(file);
  return nameParts(name).some((t) => f.includes(t));
};

/**
 * The player's files, the ones that start with his name first. Commons sorts
 * a category alphabetically, so "Chelsea 1 Sunderland 2 Eto'o Mannone" (the
 * keeper, in frame) came before "Samuel Eto'o 2009"; a file named for him is
 * nearly always a picture of him, one that mentions him is often a match.
 */
const hisFiles = (files: string[], name: string) => {
  const mine = files.filter((f) => namesPlayer(f, name));
  const leads = (f: string) => nameParts(name).some((t) => fold(f).trimStart().startsWith(t));
  return [...mine.filter(leads), ...mine.filter((f) => !leads(f))];
};

const thumb = (file: string, width = 400) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

/**
 * An in-era Commons photo: the one we already hold if its capture date falls
 * inside the career, else the first in the player's own category that does.
 * Without a career span there is nothing to check the date against, so the
 * photo is refused rather than guessed at.
 */
async function commonsPortrait(id: string, span: [number, number] | undefined): Promise<Portrait> {
  const held = images[id];
  if (!span) return { source: 'none', reason: 'no career span to date against' };
  if (!held) return { source: 'none', reason: 'no cutout and no Commons photo', career: span };
  const year = await shotIn(held);
  if (year && year >= span[0] && year <= span[1] + 1) {
    return { source: 'commons', url: thumb(held), year, career: span };
  }
  // A player's category holds more than the player: his boots in a shop, his
  // stadium, his mural. A file that does not name him is not a portrait.
  const cat = await category(id);
  const files = hisFiles(cat ? await categoryFiles(cat) : [], byId.get(id)?.name ?? '');
  for (const f of files.slice(0, 30)) {
    const y = await shotIn(f);
    if (y && y >= span[0] && y <= span[1] + 1) return { source: 'commons', url: thumb(f), year: y, career: span };
  }
  for (const sub of cat ? (await yearCategories(cat, span)).slice(0, 6) : []) {
    const inYear = hisFiles(await categoryFiles(sub), byId.get(id)?.name ?? '');
    for (const f of inYear.slice(0, 5)) {
      const y = await shotIn(f);
      if (y && y >= span[0] && y <= span[1] + 1) return { source: 'commons', url: thumb(f), year: y, career: span };
    }
  }
  return {
    source: 'none',
    career: span,
    reason: year ? `only photo is from ${year}, career ${span[0]}-${span[1]}` : 'no dated photo',
  };
}

// --------------------------------------------------------------------- main

// --itk: every career ITK could deal (its generator only deals players resolved here).
const itk = () => new Set(buildWorld(readInputs()).candidates.map((c) => c.id));

// --step: every given and the two answers a step shows once played (the obvious
// and the deepest), over the whole schedule. The deepest is by design a name
// few know, and it is shown as a card, so it needs a picture as much as a given.
async function step() {
  const [views, ruler, days] = await Promise.all([
    readFile('data/player-views.json', 'utf8').then((t) => JSON.parse(t) as Views),
    readFile('games/step/data/ruler.json', 'utf8').then((t) => JSON.parse(t) as Ruler),
    readFile('games/step/data/days.json', 'utf8').then((t) => JSON.parse(t) as StoredDay[]),
  ]);
  const members = new Map<string, Player[]>();
  for (const p of pool) for (const c of p.clubIds) { if (!members.has(c)) members.set(c, []); members.get(c)!.push(p); }
  const ids = new Set<string>();
  for (const d of days) {
    for (const s of stepsOf(d)) {
      const given = byId.get(s.player)!;
      ids.add(given.id);
      const { obvious, elite } = endsOf(given, s.club, fieldOf(given, members.get(s.club) ?? []), views, ruler);
      for (const p of [obvious, elite]) if (p) ids.add(p.id);
    }
  }
  return ids;
}
const want = ALL ? new Set(pool.map((p) => p.id)) : process.argv.includes('--itk') ? itk() : process.argv.includes('--step') ? await step() : await required();
const spans = await careers();
const done: Record<string, Portrait> = await readFile(OUT, 'utf8')
  .then((s) => JSON.parse(s) as Record<string, Portrait>)
  .catch(() => ({}));

if (ALTS) {
  // Commons and Wikidata only, so no TheSportsDB rate limit to sit under.
  // `--recheck` redoes every Commons choice, not just the missing ones: after
  // a change to the era or naming rules, every earlier pick is suspect.
  const RECHECK = process.argv.includes('--recheck');
  const eraMiss = (p: Portrait) => p.source === 'none' && /^(only photo|no dated)/.test(p.reason ?? '');
  const todoAlts = Object.keys(done).filter((id) => {
    const p = done[id]!;
    return (p.source === 'cutout' && (p.alt === undefined || RECHECK)) || (RECHECK && (p.source === 'commons' || eraMiss(p)));
  });
  console.log(`${todoAlts.length} to look at\n`);
  let i = 0;
  for (const id of todoAlts) {
    const c = await commonsPortrait(id, spans.get(id));
    const got = c.source === 'commons';
    if (done[id]!.source === 'cutout') done[id]!.alt = got ? { url: c.url!, year: c.year! } : null;
    else done[id] = c;
    await writeFile(OUT, JSON.stringify(done, null, 0));
    console.log(`  ${String(++i).padStart(3)}/${todoAlts.length}  ${(byId.get(id)?.name ?? id).padEnd(30)} ${got ? `commons ${c.year}` : `— ${c.reason}`}`);
    await sleep(250);
  }
  const alts = Object.values(done).filter((p) => p.source === 'cutout');
  console.log(`\n${alts.filter((p) => p.alt).length} of ${alts.length} cutouts have an in-era Commons alternative`);
  process.exit(0);
}

const todo = [...want].filter((id) => !done[id]);
console.log(`${want.size} players on shipped boards · ${todo.length} still to resolve\n`);

let n = 0;
for (const id of todo) {
  const p = byId.get(id);
  if (!p) continue;
  n++;

  const span = spans.get(id);
  let out: Portrait = { source: 'none', reason: 'no source', career: span };

  const cut = await cutout(p.name);
  if (cut) {
    const c = await commonsPortrait(id, span);
    out = { source: 'cutout', url: cut, career: span, alt: c.source === 'commons' ? { url: c.url!, year: c.year! } : null };
  } else {
    out = await commonsPortrait(id, span);
  }

  done[id] = out;
  // Written every time: a dropped socket must never cost the calls already made.
  await writeFile(OUT, JSON.stringify(done, null, 0));

  const tag = out.source === 'cutout' ? 'CUTOUT' : out.source === 'commons' ? `commons ${out.year}` : `— ${out.reason}`;
  console.log(`  ${String(n).padStart(3)}/${todo.length}  ${p.name.padEnd(30)} ${tag}`);
  await sleep(GAP);
}

const all = [...want].map((id) => done[id]).filter((x): x is Portrait => Boolean(x));
const count = (s: Portrait['source']) => all.filter((x) => x.source === s).length;
console.log(`\n${all.length} resolved`);
console.log(`  cutout   ${count('cutout')}  (${((count('cutout') / all.length) * 100).toFixed(0)}%)`);
console.log(`  commons  ${count('commons')}  (${((count('commons') / all.length) * 100).toFixed(0)}%)  in-era only`);
console.log(`  none     ${count('none')}  (${((count('none') / all.length) * 100).toFixed(0)}%)`);
