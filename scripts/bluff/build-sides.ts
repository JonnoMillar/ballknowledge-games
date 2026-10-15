/**
 * Bluff's team sheets: real starting XIs from famous matches, read from
 * Wikipedia (finals, and World Cup and Euro knockout pages), matched to the
 * pool by Wikidata id, with "Help the faker" candidates for every slot.
 *
 *   npm run bluff:sides
 *
 * Writes games/bluff/data/sides.json. Lineups are facts; the pages are
 * CC BY-SA 4.0 and credited on /credits.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { parseMatches, type RawMatch } from '../../games/bluff/lib/wiki';
import { formation, toLines } from '../../games/bluff/lib/lineup';
import type { Named, Side, Slot } from '../../games/bluff/lib/types';
import type { Player, PositionClass } from '../../src/lib/chemistry/types';

/** The pool begins with careers from 1992; before this, too few starters are in it to plant a fake of the era. */
const FIRST_YEAR = 1995;
const LAST_YEAR = 2026;
/** An XI is kept when at least this many of its starters are in the pool. */
const MIN_IN_POOL = 10;
/**
 * Famous sides only: the guesser has to have a chance. The XI's median pool
 * fame (sitelinks); quartiles over every XI read were 46 / 55 / 64. Senegal
 * 2002 (25) and Norway 1998 (26) fall under it; England and Brazil don't.
 */
const MIN_MEDIAN_FAME = 40;
/** A national "Help the faker" pick has been playing at least this many years by the match. */
const ESTABLISHED = 2;
/** Help candidates kept per position class. */
const HELP = 8;

const UA = { 'User-Agent': 'FootballGamesBluff/0.1 (jonno@m1llar.com)' };
const API = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';

interface Page { title: string; comp: (m: RawMatch, year: number) => string; national: boolean }

const pages: Page[] = [];
const years = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
for (const y of years(1995, LAST_YEAR)) pages.push({ title: `${y} UEFA Champions League final`, comp: () => 'Champions League final', national: false });
for (const y of years(1995, LAST_YEAR)) pages.push({ title: `${y} FA Cup final`, comp: () => 'FA Cup final', national: false });
// Finals first, so a final keeps its own name when its stage page repeats it.
for (const y of years(1998, LAST_YEAR, 4)) pages.push({ title: `${y} FIFA World Cup final`, comp: () => 'World Cup final', national: true });
for (const y of years(1996, 2024, 4)) pages.push({ title: `UEFA Euro ${y} final`, comp: () => 'Euro final', national: true });
for (const y of years(1998, LAST_YEAR, 4)) pages.push({ title: `${y} FIFA World Cup knockout stage`, comp: (m) => stageName(`World Cup ${y}`, m.stage), national: true });
for (const y of years(1996, 2024, 4)) pages.push({ title: `UEFA Euro ${y} knockout stage`, comp: (m) => stageName(`Euro ${y}`, m.stage), national: true });

function stageName(event: string, stage: string | null): string {
  const s = (stage ?? '').toLowerCase();
  if (s === 'final') return `${event} final`;
  return s ? `${event}, ${s.replace(/s$/, '')}` : event;
}

async function json<T>(url: string): Promise<T> {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return (await r.json()) as T;
    if (i === 3) throw new Error(`${r.status} ${url}`);
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
}

async function wikitext(title: string): Promise<string | null> {
  const j = await json<{ parse?: { wikitext: string } }>(`${API}action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`).catch(() => null);
  return j?.parse?.wikitext ?? null;
}

/** Article titles to Wikidata ids, following redirects. */
async function qids(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    type Q = { query: { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages: { title: string; pageprops?: { wikibase_item?: string } }[] } };
    const j = await json<Q>(`${API}action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`);
    const back = new Map<string, string[]>();
    const link = (to: string, from: string) => back.set(to, [...(back.get(to) ?? []), from, ...(back.get(from) ?? [])]);
    for (const n of j.query.normalized ?? []) link(n.to, n.from);
    for (const r of j.query.redirects ?? []) link(r.to, r.from);
    for (const p of j.query.pages) {
      const q = p.pageprops?.wikibase_item;
      if (!q) continue;
      out.set(p.title, q);
      for (const from of back.get(p.title) ?? []) out.set(from, q);
    }
  }
  return out;
}

interface Stint { from: number | null; to: number | null; q: string; loan: boolean }
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const byId = new Map(pool.map((p) => [p.id, p]));
const careers = (JSON.parse(await readFile('data/careers.json', 'utf8')) as { players: Record<string, { stints: Stint[] }> }).players;

/** The season a date falls in, by its first year: May 2005 is 2004/05. */
const seasonOf = (date: string) => (+date.slice(5, 7) >= 7 ? +date.slice(0, 4) : +date.slice(0, 4) - 1);
const atClub = (s: Stint, season: number) => (s.from ?? 9999) <= season && (s.to ?? 9999) >= season + 1;
const active = (s: Stint, year: number) => (s.from ?? 9999) <= year && (s.to ?? 9999) >= year;

function mode<T>(xs: T[]): T | null {
  const n = new Map<T, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Players who could have been in this XI and weren't: same club that season (or same nation that year), by position class, most famous first. */
function help(ids: string[], date: string, national: boolean): Side['help'] {
  const inXi = new Set(ids);
  const year = +date.slice(0, 4);
  const season = seasonOf(date);
  let fits: (p: Player) => boolean;
  if (national) {
    const nation = mode(ids.map((id) => byId.get(id)?.nation).filter((n): n is string => !!n));
    // Established by then, not a teenager who broke through that year.
    fits = (p) => {
      const stints = careers[p.id]?.stints ?? [];
      const start = Math.min(...stints.map((s) => s.from ?? 9999));
      return p.nation === nation && start <= year - ESTABLISHED && stints.some((s) => active(s, year));
    };
  } else {
    const club = mode(ids.flatMap((id) => (careers[id]?.stints ?? []).filter((s) => atClub(s, season)).map((s) => s.q)));
    fits = (p) => (careers[p.id]?.stints ?? []).some((s) => s.q === club && atClub(s, season));
  }
  const pick = pool.filter((p) => !inXi.has(p.id) && fits(p)).sort((a, b) => b.fame.value - a.fame.value);
  const out: Side['help'] = {};
  for (const c of ['GK', 'DEF', 'MID', 'FWD'] as PositionClass[]) {
    const list: Named[] = pick.filter((p) => p.positions.includes(c)).slice(0, HELP).map((p) => ({ id: p.id, name: p.name }));
    if (list.length) out[c] = list;
  }
  return out;
}

const found: { page: Page; match: RawMatch }[] = [];
const seen = new Set<string>();
const problems: string[] = [];
for (const page of pages) {
  const text = await wikitext(page.title);
  if (!text) { problems.push(`no page: ${page.title}`); continue; }
  const matches = parseMatches(text);
  if (!matches.length) problems.push(`no lineups: ${page.title}`);
  for (const match of matches) {
    if (!match.date || !match.team1 || !match.team2) { problems.push(`unread match on ${page.title}: ${JSON.stringify([match.date, match.team1, match.team2])}`); continue; }
    const key = `${match.date}:${[match.team1, match.team2].sort().join('|')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ page, match });
  }
}

const ids = await qids([...new Set(found.flatMap(({ match }) => match.xis.flat().map((p) => p.title)))]);

const sides: Side[] = [];
let obscure = 0;
for (const { page, match } of found) {
  const year = +match.date!.slice(0, 4);
  if (year < FIRST_YEAR) continue;
  match.xis.forEach((xi, i) => {
    const team = i === 0 ? match.team1! : match.team2!;
    const opponent = i === 0 ? match.team2! : match.team1!;
    const slots = xi.map((p) => {
      const id = ids.get(p.title) ?? null;
      const known = id ? byId.get(id) : undefined;
      return { pos: p.pos, player: { id: known ? id : null, name: known?.name ?? p.text, pos: p.pos } as Slot };
    });
    const inPool = slots.filter((s) => s.player.id).length;
    if (inPool < MIN_IN_POOL) return;
    const fames = slots.flatMap((s) => (s.player.id ? [byId.get(s.player.id)!.fame.value] : [])).sort((x, y) => x - y);
    if (fames[fames.length >> 1]! < MIN_MEDIAN_FAME) { obscure++; return; }
    const lines = toLines(slots);
    if (!lines) { problems.push(`odd positions: ${team} ${match.date} ${xi.map((p) => p.pos).join(' ')}`); return; }
    const [a, b] = (match.score ?? '').split('–');
    sides.push({
      key: `${match.date}:${team}`,
      team,
      opponent,
      date: match.date!,
      comp: page.comp(match, year),
      score: match.score ? (i === 0 ? `${a}–${b}` : `${b}–${a}`) : null,
      formation: formation(lines),
      lines: lines.map((l) => l.map((s) => s.player)),
      help: help(slots.flatMap((s) => (s.player.id ? [s.player.id] : [])), match.date!, page.national),
    });
  });
}

sides.sort((x, y) => x.date.localeCompare(y.date));
await writeFile('games/bluff/data/sides.json', `${JSON.stringify(sides)}\n`);

const byComp = new Map<string, number>();
for (const s of sides) { const c = s.comp.replace(/\d{4}/, '').replace(/,.*/, '').trim(); byComp.set(c, (byComp.get(c) ?? 0) + 1); }
console.log(`${found.length} matches read, ${sides.length} XIs kept, ${obscure} too obscure`);
for (const [c, n] of byComp) console.log(`  ${c}: ${n}`);
const thin = sides.filter((s) => Object.keys(s.help).length < 4).map((s) => s.key);
if (thin.length) console.log(`help missing a class on ${thin.length}: ${thin.slice(0, 8).join(', ')}`);
if (problems.length) console.log(`\n${problems.length} problems:\n  ${problems.join('\n  ')}`);
