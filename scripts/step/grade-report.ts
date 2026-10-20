import { readFile } from 'node:fs/promises';
import { fieldOf, judge, stepsOf } from '../../games/step/lib/rules';
import type { StoredDay } from '../../games/step/lib/day';
import type { Player } from '../../src/lib/chemistry/types';

/**
 * Every step of some real days, its field ranked the way the grade sees it,
 * with what a fan would judge by: fame, English Wikipedia views and the
 * stint at the club. For reading the ruler as a fan, not for the game.
 *
 * Usage: tsx scripts/step/grade-report.ts [firstDay=1] [days=6]
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const byId = new Map(pool.map((p) => [p.id, p]));
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, { name: string }>;
const days = JSON.parse(await readFile('games/step/data/days.json', 'utf8')) as StoredDay[];
const careers = JSON.parse(await readFile('data/careers.json', 'utf8')).players as Record<string, { title: string }>;
const views = JSON.parse(await readFile('data/enwiki-views.json', 'utf8')) as Record<string, number>;
const redirects = JSON.parse(await readFile('data/enwiki-views.redirects.json', 'utf8')) as Record<string, string>;
const byIdViews = JSON.parse(await readFile('data/player-views.json', 'utf8')) as Record<string, number>;
const viewsOf = (p: Player) => { const t = careers[p.id]?.title; return t ? views[redirects[t] ?? t] : undefined; };

const byClub = new Map<string, Player[]>();
for (const p of pool) for (const c of p.clubIds) { if (!byClub.has(c)) byClub.set(c, []); byClub.get(c)!.push(p); }

const first = Number(process.argv[2] ?? 1);
const count = Number(process.argv[3] ?? 6);
const spell = (p: Player, c: string) => { const s = p.spells?.[c]; return s ? `${s[0] ?? '?'}a ${s[2] ?? '?'}` : '-'; };
const k = (n: number | undefined) => (n === undefined ? '   ?' : `${Math.round(n / 1000)}k`.padStart(6));

for (const d of days.slice(first - 1, first - 1 + count)) {
  for (const s of stepsOf(d)) {
    const given = byId.get(s.player)!;
    const field = fieldOf(given, byClub.get(s.club) ?? []);
    const rows = field.map((p) => ({ p, j: judge(p, given, s.club, byClub.get(s.club) ?? [], byIdViews) }));
    const rank = { basic: 0, decent: 1, solid: 2, sharp: 3, elite: 4 } as const;
    rows.sort((a, b) => rank[a.j.grade!] - rank[b.j.grade!] || b.p.fame.value - a.p.fame.value);
    console.log(`\n${d.date}  ${given.name} — ${clubs[s.club]?.name}  (field ${field.length})`);
    for (const { p, j } of rows) {
      console.log(`  ${j.grade!.padEnd(6)} ${p.name.padEnd(28)} fame ${String(p.fame.value).padStart(3)} views ${k(viewsOf(p))}  here ${spell(p, s.club).padEnd(10)} via ${clubs[j.via!]?.name ?? '?'}`);
    }
  }
}
