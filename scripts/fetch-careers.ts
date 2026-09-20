import { readFile, writeFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Fetch senior careers from ENGLISH WIKIPEDIA's football infobox, as a
 * second source beside Wikidata's P54.
 *
 * Usage: tsx scripts/fetch-careers.ts [--limit N]
 * Writes data/careers.json. Reruns resume from it.
 *
 * WHY. Wikidata's P54 stops mid-career for about a third of the pool:
 * 4,163 of 11,741 players carry an open-ended spell that started six or
 * more years ago. Manolo Gabbiadini is "at Napoli since 2015" and has no
 * Southampton at all. The Chain's fields absorb that; Rondo cannot, because
 * a missing stint is a wrong "no link" on a fact everyone at the table
 * knows. The infobox (`clubs1 = [[Southampton F.C.]]`, `years1`, `caps1`)
 * is the best-maintained free record of a senior career there is.
 *
 * ROUTE. Player QID -> enwiki sitelink (wbgetentities, 50 a call) -> the
 * article's wikitext (revisions, 50 a call) -> the infobox's clubsN rows ->
 * each club link's QID (pageprops.wikibase_item, 50 a call, redirects
 * followed). Youth clubs and national teams are separate infobox keys and
 * are not read. Loans are `→ [[Club]] (loan)` and are kept, since a loan
 * spell is a spell.
 *
 * THIS SCRIPT DOES NOT TOUCH pool.json. It writes a sidecar; merging is a
 * separate decision because it changes the Chain's fields.
 */
const AGENT = 'RecallXI/0.1 (https://github.com/; jonno@m1llar.com)';
const OUT = 'data/careers.json';
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? Number(process.argv[i + 1]) : 0; })();

export interface Stint {
  /** Club QID, when the link resolved. */
  q?: string;
  /** The article title the infobox linked to. */
  title: string;
  from?: number;
  to?: number;
  apps?: number;
  goals?: number;
  loan: boolean;
}
export interface Career { title: string; stints: Stint[] }
export interface Careers {
  fetched: string;
  /** Player QID -> career. Absent: no enwiki article, or no infobox rows. */
  players: Record<string, Career>;
  /** Club article title -> QID. Null: no Wikidata item found. */
  clubs: Record<string, string | null>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(base: string, params: Record<string, string>): Promise<any> {
  const url = `${base}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (res.ok) return res.json();
    await sleep(800 * 2 ** attempt);
  }
  throw new Error(`API failed: ${url.slice(0, 160)}`);
}
const wd = (p: Record<string, string>) => get('https://www.wikidata.org/w/api.php', p);
const en = (p: Record<string, string>) => get('https://en.wikipedia.org/w/api.php', p);

const chunk = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** The first wikilink target on a line, with the section anchor dropped. */
function linkTarget(s: string): string | null {
  const m = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/.exec(s);
  if (!m) return null;
  const t = m[1]!.trim().replace(/_/g, ' ');
  return t ? t[0]!.toUpperCase() + t.slice(1) : null;
}

/** "2017–2019" | "2015–" | "2012" -> from/to. */
function years(s: string): { from?: number; to?: number } {
  const m = /(\d{4})\s*[–—-]\s*(\d{4})?/.exec(s);
  if (m) return { from: Number(m[1]), ...(m[2] ? { to: Number(m[2]) } : {}) };
  const one = /(\d{4})/.exec(s);
  return one ? { from: Number(one[1]), to: Number(one[1]) } : {};
}

/** The infobox's clubsN / yearsN / capsN / goalsN rows, as stints. */
export function parseInfobox(wikitext: string): Stint[] {
  const rows = new Map<number, Partial<Stint> & { title?: string }>();
  const row = (n: number) => { const r = rows.get(n) ?? { loan: false }; rows.set(n, r); return r; };
  // Several params often share a line (`| years1 = … | clubs1 = … | caps1 = …`),
  // so the key is anchored on its own pipe, not on the line — which also
  // keeps youthclubs1 from reading as clubs1. A value runs to the next bare
  // pipe; pipes inside [[links]] belong to the value.
  const clean = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '');
  const re = /\|\s*(clubs|years|caps|goals)(\d+)\s*=\s*((?:\[\[[^\]]*\]\]|[^|\n\[])*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const [, key, num, raw] = m as unknown as [string, string, string, string];
    const n = Number(num);
    const value = raw.trim();
    if (key === 'clubs') {
      const title = linkTarget(value);
      if (!title) continue;
      const r = row(n);
      r.title = title;
      r.loan = /→|\(loan\)/i.test(value);
    } else if (key === 'years') {
      Object.assign(row(n), years(value));
    } else {
      const v = Number(value.replace(/[^\d-]/g, '').replace(/-.*/, ''));
      if (Number.isFinite(v) && value !== '') row(n)[key === 'caps' ? 'apps' : 'goals'] = v;
    }
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).flatMap(([, r]) => (r.title ? [r as Stint] : []));
}

async function main() {
  const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
  const out: Careers = await readFile(OUT, 'utf8')
    .then((s) => JSON.parse(s) as Careers)
    .catch(() => ({ fetched: '', players: {}, clubs: {} }));
  const save = () => writeFile(OUT, JSON.stringify({ ...out, fetched: new Date().toISOString() }));

  const todo = pool.filter((p) => !(p.id in out.players)).slice(0, LIMIT || undefined);
  console.log(`${pool.length} in the pool, ${Object.keys(out.players).length} done, ${todo.length} to fetch`);

  // 1. Player QID -> enwiki title.
  const titles = new Map<string, string>();
  for (const ids of chunk(todo.map((p) => p.id), 50)) {
    const j = await wd({ action: 'wbgetentities', ids: ids.join('|'), props: 'sitelinks', sitefilter: 'enwiki' });
    for (const id of ids) {
      const t = j.entities?.[id]?.sitelinks?.enwiki?.title;
      if (t) titles.set(id, t);
      else out.players[id] = { title: '', stints: [] };
    }
    process.stdout.write(`\r  titles ${titles.size}`);
    await sleep(120);
  }
  console.log();

  // 2. Title -> wikitext -> stints.
  const byTitle = new Map([...titles].map(([id, t]) => [t, id]));
  const clubTitles = new Set<string>();
  let n = 0;
  for (const batch of chunk([...titles.values()], 50)) {
    // Content for many pages comes back in instalments: the response holds
    // revisions for some of the pages and a `continue` token for the rest.
    // A page with no revisions in this instalment is not an empty page.
    const params: Record<string, string> = { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: batch.join('|') };
    let cont: Record<string, string> = {};
    do {
      const j = await en({ ...params, ...cont });
      const redirected = new Map<string, string>();
      for (const r of j.query?.redirects ?? []) redirected.set(r.to, r.from);
      for (const page of Object.values(j.query?.pages ?? {}) as any[]) {
        const from = redirected.get(page.title) ?? page.title;
        const id = byTitle.get(from);
        if (!id) continue;
        const text: string | undefined = page.revisions?.[0]?.slots?.main?.['*'];
        if (text === undefined) {
          if (page.missing !== undefined) out.players[id] = { title: page.title, stints: [] };
          continue;
        }
        const stints = parseInfobox(text);
        for (const s of stints) clubTitles.add(s.title);
        out.players[id] = { title: page.title, stints };
      }
      cont = j.continue ?? {};
      if (Object.keys(cont).length) await sleep(120);
    } while (Object.keys(cont).length);
    n += batch.length;
    process.stdout.write(`\r  careers ${n}/${titles.size}`);
    if (n % 500 === 0) await save();
    await sleep(120);
  }
  console.log();

  // 3. Club title -> QID.
  const unresolved = [...clubTitles].filter((t) => !(t in out.clubs));
  let c = 0;
  for (const batch of chunk(unresolved, 50)) {
    const j = await en({ action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: batch.join('|') });
    const redirected = new Map<string, string>();
    for (const r of j.query?.redirects ?? []) redirected.set(r.to, r.from);
    const normalised = new Map<string, string>();
    for (const r of j.query?.normalized ?? []) normalised.set(r.to, r.from);
    for (const page of Object.values(j.query?.pages ?? {}) as any[]) {
      const q = page.pageprops?.wikibase_item ?? null;
      const canonical = page.title as string;
      const asked = normalised.get(redirected.get(canonical) ?? canonical) ?? redirected.get(canonical) ?? canonical;
      out.clubs[asked] = q;
      out.clubs[canonical] = q;
    }
    for (const t of batch) if (!(t in out.clubs)) out.clubs[t] = null;
    c += batch.length;
    process.stdout.write(`\r  clubs ${c}/${unresolved.length}`);
    await sleep(120);
  }
  console.log();

  for (const career of Object.values(out.players)) {
    for (const s of career.stints) { const q = out.clubs[s.title]; if (q) s.q = q; }
  }
  await save();

  // The report.
  const byId = new Map(pool.map((p) => [p.id, p]));
  let withCareer = 0, playersGaining = 0, stintsAdded = 0, unresolvedStints = 0;
  for (const [id, career] of Object.entries(out.players)) {
    if (career.stints.length === 0) continue;
    withCareer++;
    const have = new Set(byId.get(id)?.clubIds ?? []);
    const add = new Set(career.stints.filter((s) => s.q && !have.has(s.q)).map((s) => s.q!));
    unresolvedStints += career.stints.filter((s) => !s.q).length;
    if (add.size > 0) { playersGaining++; stintsAdded += add.size; }
  }
  console.log(`\n${withCareer} careers read; ${playersGaining} players gain ${stintsAdded} clubs Wikidata lacks; ${unresolvedStints} stints link to a club with no Wikidata item.`);
}

if (process.argv[1]?.endsWith('fetch-careers.ts')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
