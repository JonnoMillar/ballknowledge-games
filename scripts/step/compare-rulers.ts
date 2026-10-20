import { readFile } from 'node:fs/promises';
import { factOf, fieldOf, stepsOf, CHECKABLE } from '../../games/step/lib/rules';
import type { StoredDay } from '../../games/step/lib/day';
import { factFame, spellWeight } from '../../src/lib/fame/spell';
import { ELITE_MIN_FIELD, gradeOf, GRADES, type Grade } from '../../src/lib/chain/grade';
import type { Player } from '../../src/lib/chemistry/types';

/**
 * Candidate grading rulers for Steps, side by side on the real schedule:
 * how each grades a set of fan-judged picks (PINS), how often a household
 * name with a long stint at the club grades deep, how often a nobody with a
 * short one grades Basic, and how the grades spread. Throwaway research;
 * the chosen ruler lives in games/step/lib/rules.ts.
 *
 * Usage: tsx scripts/step/compare-rulers.ts [--moves]
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const byId = new Map(pool.map((p) => [p.id, p]));
const byName = new Map(pool.map((p) => [p.name, p]));
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, { name: string }>;
const days = JSON.parse(await readFile('games/step/data/days.json', 'utf8')) as StoredDay[];
// QID -> views, from the title-keyed file (data/player-views.json is the same thing, written at the end of a fetch).
const careers = JSON.parse(await readFile('data/careers.json', 'utf8')).players as Record<string, { title?: string }>;
const titled = JSON.parse(await readFile('data/enwiki-views.json', 'utf8')) as Record<string, number>;
const redirects = JSON.parse(await readFile('data/enwiki-views.redirects.json', 'utf8')) as Record<string, string>;
const views: Record<string, number> = {};
for (const p of pool) { const t = careers[p.id]?.title; const v = t === undefined ? undefined : titled[redirects[t] ?? t]; if (v !== undefined) views[p.id] = v; }
const byClub = new Map<string, Player[]>();
for (const p of pool) for (const c of p.clubIds) { if (!byClub.has(c)) byClub.set(c, []); byClub.get(c)!.push(p); }

// log10(views) ~ A + B * sitelinks, fitted below on the players that have both.
const have = pool.filter((p) => (views[p.id] ?? 0) > 0);
const mx = have.reduce((s, p) => s + p.fame.value, 0) / have.length;
const my = have.reduce((s, p) => s + Math.log10(views[p.id]!), 0) / have.length;
const B = have.reduce((s, p) => s + (p.fame.value - mx) * (Math.log10(views[p.id]!) - my), 0) / have.reduce((s, p) => s + (p.fame.value - mx) ** 2, 0);
const A = my - B * mx;
console.log(`fit: log10(views) = ${A.toFixed(3)} + ${B.toFixed(4)} * sitelinks over ${have.length} players`);
const known = (p: Player) => ((views[p.id] ?? 0) > 0 ? views[p.id]! : 10 ** (A + B * p.fame.value));
const w = (p: Player, c: string, a = 1) => spellWeight(p.spells?.[c]) ** a;

type Ruler = (x: Player, g: Player, club: string) => number;
const shared = (x: Player, g: Player) => x.clubIds.filter((c) => g.clubIds.includes(c));
const est = (p: Player) => 10 ** (A + B * p.fame.value);
const R2g = (x: Player, g: Player, c: string, e: number, blend = 1) => {
  const k = (p: Player) => (known(p) ** blend * est(p) ** (1 - blend)) ** e;
  return Math.min(Math.max(...shared(x, g).map((s) => Math.min(k(x) * w(x, s), k(g) * w(g, s)))), k(x) * w(x, c));
};
const RULERS: Record<string, Ruler> = {
  // Today: sitelinks × the less known of (link, both ends' stints; stint at club).
  R0_now: (x, g, c) => Math.min(factFame(x, [{ player: g }], 'clubs'), x.fame.value * w(x, c)),
  // Same shape, enwiki views for fame.
  R1_views: (x, g, c) => Math.min(known(x) * Math.max(...shared(x, g).map((s) => Math.min(w(x, s), w(g, s)))), known(x) * w(x, c)),
  // Views, and the given's half of the link is a fact about the given: their fame × their stint.
  R2_views_given: (x, g, c) => Math.min(Math.max(...shared(x, g).map((s) => Math.min(known(x) * w(x, s), known(g) * w(g, s)))), known(x) * w(x, c)),
  // R2 with views compressed (views ^ g): views span 1000x, stints 20x; g balances them.
  R4_g80: (x, g, c) => R2g(x, g, c, 0.8),
  // Views and sitelinks blended in log space (they fail in opposite ways: America and managers, abroad).
  R5_b65_g80: (x, g, c) => R2g(x, g, c, 0.8, 0.65),
  // What games/step/lib/rules.ts ships (should match R4_g80).
  GAME: (x, g, c) => factOf(x, g, c, views),
  // R2 with stints tempered (weight ^ 0.5): a short stint halves recognition less.
  R3_temper: (x, g, c) => Math.min(Math.max(...shared(x, g).map((s) => Math.min(known(x) * w(x, s, 0.5), known(g) * w(g, s, 0.5)))), known(x) * w(x, c, 0.5)),
};

function grades(ruler: Ruler, given: Player, club: string): Map<string, Grade> {
  const field = fieldOf(given, byClub.get(club) ?? []);
  const f = new Map(field.map((p) => [p.id, ruler(p, given, club)]));
  const checkable = field.filter((p) => p.fame.value >= CHECKABLE);
  const deep = Math.min(...(checkable.length ? checkable : field).map((p) => f.get(p.id)!));
  return new Map(field.map((p) => {
    const mine = f.get(p.id)!;
    const above = field.filter((q) => q.id !== p.id && f.get(q.id)! > mine).length;
    return [p.id, gradeOf(above, field.length, field.length >= ELITE_MIN_FIELD && mine <= deep)];
  }));
}

/**
 * Picks a British fan can judge without a ruler, on real steps of the schedule:
 * [given, club, pick, lowest acceptable grade, highest acceptable grade].
 */
const PINS: [string, string, string, Grade, Grade][] = [
  ['Thierry Henry', 'ACF Fiorentina', 'Roberto Baggio', 'basic', 'basic'],
  ['Thierry Henry', 'ACF Fiorentina', 'Federico Chiesa', 'basic', 'decent'],
  ['Thierry Henry', 'ACF Fiorentina', 'Dušan Vlahović', 'basic', 'decent'],
  ['Thierry Henry', 'ACF Fiorentina', 'Ramón Díaz', 'solid', 'elite'],
  ['Arjen Robben', 'AS Roma', 'Mohamed Salah', 'basic', 'decent'],
  ['Raheem Sterling', 'Tottenham Hotspur F.C.', 'Robbie Keane', 'basic', 'solid'],
  ['Neymar', 'Chelsea F.C.', "Samuel Eto'o", 'basic', 'solid'],
  ['Ashley Cole', 'Nottingham Forest F.C.', 'Ian Wright', 'solid', 'elite'],
  ['Lamine Yamal', 'RCD Espanyol de Barcelona', "Samuel Eto'o", 'solid', 'elite'],
  ['Neymar', 'AS Roma', 'Pep Guardiola', 'solid', 'elite'],
];

const clubId = new Map(Object.entries(clubs).map(([id, c]) => [c.name, id]));
const steps = days.flatMap((d) => stepsOf(d).map((s) => ({ date: d.date, given: byId.get(s.player)!, club: s.club })));
const all = Object.fromEntries(Object.entries(RULERS).map(([k, r]) => [k, steps.map((s) => grades(r, s.given, s.club))]));

for (const [name] of Object.entries(RULERS)) {
  const gs = all[name]!;
  let famousDeep = 0, nobodyBasic = 0, total = 0;
  const spread = Object.fromEntries(GRADES.map((g) => [g, 0]));
  steps.forEach((s, i) => gs[i]!.forEach((g, id) => {
    const p = byId.get(id)!;
    const apps = p.spells?.[s.club]?.[0] ?? null;
    total++; spread[g]!++;
    if (p.fame.value >= 75 && (views[id] ?? 0) >= 1e6 && apps !== null && apps >= 100 && (g === 'sharp' || g === 'elite')) famousDeep++;
    if ((views[id] ?? 0) > 0 && views[id]! < 100e3 && apps !== null && apps < 30 && (g === 'basic' || g === 'decent')) nobodyBasic++;
  }));
  const pins = PINS.map(([gn, cn, pn, lo, hi]) => {
    const i = steps.findIndex((s) => s.given.name === gn && s.club === clubId.get(cn));
    const g = i < 0 ? undefined : gs[i]!.get(byName.get(pn)?.id ?? '');
    const ok = g !== undefined && GRADES.indexOf(g) >= GRADES.indexOf(lo) && GRADES.indexOf(g) <= GRADES.indexOf(hi);
    return { ok, line: `${ok ? 'ok ' : 'BAD'} ${pn} (${gn} · ${cn}): ${g ?? 'not in field'}` };
  });
  console.log(`\n${name}: pins ${pins.filter((p) => p.ok).length}/${PINS.length}, famous+long stint graded Sharp/Elite ${famousDeep}, unknown+short stint graded Basic/Decent ${nobodyBasic}, of ${total} picks over ${steps.length} steps`);
  console.log('  spread', GRADES.map((g) => `${g} ${(100 * spread[g]! / total).toFixed(0)}%`).join('  '));
  for (const p of pins) if (!p.ok) console.log('  ', p.line);
}

/** Cases to read under every ruler: [given, club, pick]. */
const PROBES: [string, string, string][] = [
  ['Neymar', 'AS Roma', 'Pep Guardiola'], ['David de Gea', 'Sevilla FC', 'Enzo Maresca'],
  ['Ashley Young', 'Nottingham Forest F.C.', 'Sean Dyche'], ['Lamine Yamal', 'RCD Espanyol de Barcelona', "Samuel Eto'o"],
  ['Ashley Cole', 'Nottingham Forest F.C.', 'Ian Wright'], ['Ashley Cole', 'Nottingham Forest F.C.', 'Matt Turner'], ['Ashley Cole', 'Nottingham Forest F.C.', 'Viv Anderson'], ['Michael Ballack', 'AC Milan', 'George Weah'],
  ['Patrick Vieira', 'AS Monaco FC', 'George Weah'], ['Andriy Shevchenko', 'FC Barcelona', 'Patrick Kluivert'],
  ['Rodri', 'AC Milan', 'Edgar Davids'], ['Sergio Ramos', 'Chelsea F.C.', 'Marcos Alonso Mendoza'],
  ['Kevin De Bruyne', 'Sunderland A.F.C.', 'Danny Welbeck'], ['Andrés Iniesta', 'RCD Espanyol de Barcelona', 'Ernesto Valverde'],
];
if (process.argv.includes('--probes')) {
  console.log('\nprobe'.padEnd(65) + Object.keys(RULERS).map((k) => k.padEnd(16)).join(''));
  for (const [gn, cn, pn] of PROBES) {
    const i = steps.findIndex((s) => s.given.name === gn && s.club === clubId.get(cn));
    console.log(`${pn} (${gn} · ${cn})`.slice(0, 62).padEnd(64) + Object.keys(RULERS).map((k) => (i < 0 ? 'no step' : all[k]![i]!.get(byName.get(pn)?.id ?? '') ?? 'not in field').padEnd(16)).join(''));
  }
}

if (process.argv.includes('--odd')) {
  // What still reads wrong under the shipped ruler, by the same two tests as the summary.
  steps.forEach((s, i) => all.GAME![i]!.forEach((g, id) => {
    const p = byId.get(id)!; const apps = p.spells?.[s.club]?.[0] ?? null;
    const famous = p.fame.value >= 75 && (views[id] ?? 0) >= 1e6 && apps !== null && apps >= 100 && (g === 'sharp' || g === 'elite');
    const nobody = (views[id] ?? 0) > 0 && views[id]! < 100e3 && apps !== null && apps < 30 && (g === 'basic' || g === 'decent');
    if (famous || nobody) console.log(`  ${g.padEnd(6)} ${p.name} (${s.given.name} · ${clubs[s.club]?.name}) ${apps} games, ${Math.round((views[id] ?? 0) / 1e3)}k views`);
  }));
}

if (process.argv.includes('--moves')) {
  // The biggest disagreements between the old ruler and the shipped one, for reading.
  const last = 'GAME';
  const moves: { d: number; line: string }[] = [];
  steps.forEach((s, i) => all.R0_now![i]!.forEach((g, id) => {
    const h = all[last]![i]!.get(id)!;
    const d = GRADES.indexOf(h) - GRADES.indexOf(g);
    if (Math.abs(d) >= 2) moves.push({ d, line: `${g.padEnd(6)} -> ${h.padEnd(6)} ${byId.get(id)!.name} (${s.given.name} · ${clubs[s.club]?.name})` });
  }));
  moves.sort((a, b) => a.d - b.d);
  console.log(`\n${moves.length} picks move two grades or more, R0_now -> ${last}:`);
  for (const m of moves) console.log('  ' + m.line);
}
