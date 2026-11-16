/**
 * Where each Odd Man Out player actually plays, finer than the pool's
 * DEF/MID/FWD, so Find the mole never plants a playmaker in a holding
 * midfielder's slot (Jonno, 2026-11-16: James Rodríguez at Casemiro's DM was
 * a giveaway). Reads the `position` line of each player's English Wikipedia
 * infobox, 50 pages a request, for every starter and "Help the faker" pick
 * in a run side, and writes games/bluff/data/roles.json: { id: Role[] }.
 *
 * Run: npx tsx scripts/bluff/fetch-roles.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { rolesOfText, type Role } from '../../games/bluff/lib/roles';
import { runPool } from '../../games/bluff/lib/run';
import type { Side } from '../../games/bluff/lib/types';

const sides = JSON.parse(readFileSync('games/bluff/data/sides.json', 'utf8')) as Side[];
const titles = JSON.parse(readFileSync('data/enwiki-titles.json', 'utf8')) as Record<string, string>;

const ids = new Set<string>();
for (const s of runPool(sides)) {
  for (const g of Object.values(s.help)) for (const p of g ?? []) ids.add(p.id);
  for (const l of s.lines) for (const p of l) if (p.id) ids.add(p.id);
}
const want = [...ids].filter((id) => titles[id]);
console.log(`${ids.size} players, ${want.length} with an enwiki title`);

/** "[[Midfielder#Attacking midfielder|Attacking midfielder]], [[Winger (association football)|winger]]" to plain words. */
const plain = (s: string) => s
  .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  .replace(/\{\{[^{}]*\}\}/g, (t) => (/^\{\{(?:nowrap|nobr)\|/i.test(t) ? t.replace(/^\{\{\w+\||\}\}$/g, '') : ' '))
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
  .replace(/<br\s*\/?>/gi, ', ');

const out: Record<string, Role[]> = {};
let none = 0;
for (let i = 0; i < want.length; i += 50) {
  const batch = want.slice(i, i + 50);
  const byTitle = new Map(batch.map((id) => [titles[id]!, id]));
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=revisions&rvprop=content&rvslots=main&rvsection=0&redirects=1&titles=${encodeURIComponent(batch.map((id) => titles[id]).join('|'))}`;
  // Wikipedia rate-limits bursts: a pause between requests, and a longer one (its Retry-After) on a 429.
  let res: Response;
  for (let tries = 0; ; tries++) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, { headers: { 'user-agent': 'ballknowledge-games-build/1.0' } });
    if (res.status !== 429 || tries >= 5) break;
    await new Promise((r) => setTimeout(r, 1000 * Number(res.headers.get('retry-after') ?? 10)));
  }
  if (!res.ok) throw new Error(`enwiki ${res.status}`);
  const j = (await res.json()) as { query: { pages: { title: string; revisions?: { slots: { main: { content: string } } }[] }[]; redirects?: { from: string; to: string }[]; normalized?: { from: string; to: string }[] } };
  // A page's title may differ from ours by normalising or a redirect: follow both back.
  const back = new Map<string, string>();
  for (const n of j.query.normalized ?? []) back.set(n.to, n.from);
  for (const r of j.query.redirects ?? []) back.set(r.to, back.get(r.from) ?? r.from);
  for (const p of j.query.pages) {
    const id = byTitle.get(p.title) ?? byTitle.get(back.get(p.title) ?? '');
    if (!id) continue;
    const text = p.revisions?.[0]?.slots.main.content ?? '';
    const line = /^\s*\|\s*position\s*=\s*(.+)$/im.exec(text)?.[1] ?? '';
    const roles = rolesOfText(plain(line));
    if (roles.length) out[id] = roles; else none++;
  }
  process.stdout.write('.');
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync('games/bluff/data/roles.json', `${JSON.stringify(sorted, null, 0).replace(/\],"/g, '],\n"')}\n`);
console.log(`\n${Object.keys(out).length} with roles, ${none} with none read`);
