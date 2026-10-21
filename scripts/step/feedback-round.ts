import { readFile, readdir, writeFile } from 'node:fs/promises';
import { FIT_A, FIT_B, fieldOf, judge, stepsOf, type Views } from '../../games/step/lib/rules';
import { buildWorld, type StoredDay } from '../../games/step/lib/day';
import { factFame, spellWeight } from '../../src/lib/fame/spell';
import { ELITE_MIN_FIELD, GRADES, GRADE_WORD, gradeOf, type Grade } from '../../src/lib/chain/grade';
import { CHECKABLE } from '../../games/step/lib/rules';
import type { Player } from '../../src/lib/chemistry/types';
import { plateName } from '../../src/lib/short-name';
import { shortClubName } from '../../components/ClubBadge';

/**
 * A feedback round for Steps' grades: ~30 picks from days already played (no
 * spoilers), each with the grade the game gives it, for Jonno to mark too
 * high, right or too low on tools/feedback-round/page.html.
 *
 * Picks are ones a fan might actually name (an English page with some
 * readership), chosen to cover what judgement has to settle: where the ruler
 * moved most, links through the given's own short spell, players whose
 * English views run far past their sitelinks (managers, pundits), and an
 * even spread over the five grades.
 *
 * Later rounds skip every pick an earlier round asked about, and probe what
 * round 1 left open: players whose careers ended before 2010, clubs outside
 * the Premier League, and short current spells.
 *
 * Usage: tsx scripts/step/feedback-round.ts <round id> [until=yesterday]
 */
const id = process.argv[2] ?? 'steps-1';
const until = process.argv[3] ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const json = async <T>(f: string) => JSON.parse(await readFile(f, 'utf8')) as T;
const pool = await json<Player[]>('data/pool.json');
const byId = new Map(pool.map((p) => [p.id, p]));
const clubs = await json<Record<string, { name: string }>>('data/clubs.json');
const views = await json<Views>('data/player-views.json');
const days = (await json<StoredDay[]>('games/step/data/days.json')).filter((d) => d.date <= until);
const byClub = new Map<string, Player[]>();
for (const p of pool) for (const c of p.clubIds) { if (!byClub.has(c)) byClub.set(c, []); byClub.get(c)!.push(p); }
const bar = await json<[number, number, number]>('games/step/data/bar.json');
const english = buildWorld(pool, views).english;
const asked = new Set<string>();
for (const f of await readdir('tools/feedback-round/rounds')) {
  if (!f.startsWith('steps-') || f === `${id}.json`) continue;
  for (const it of (await json<{ items: { meta: { pick: string } }[] }>(`tools/feedback-round/rounds/${f}`)).items) asked.add(it.meta.pick);
}
const NOW = new Date(until).getFullYear();

const short = (c: string) => (clubs[c]?.name ?? c).replace(/ (F\.C\.|A\.F\.C\.|FC|CF|C\.F\.)$/, '').replace(/^(AS|ACF|SS|AC|FC|RCD|SL|S\.L\.|AFC) /, '').replace('Club de Fútbol', '').trim();
const apps = (p: Player, c: string) => { const s = p.spells?.[c]; return s?.[0] ?? null; };
const ended = (p: Player, c: string) => p.spells?.[c]?.[2] ?? null;

/** The grade under the ruler before 2026-10-19 (sitelinks; the given's short spells count against the link). */
function oldGrade(field: Player[], pick: Player, given: Player, club: string): Grade {
  const fact = (x: Player) => Math.min(factFame(x, [{ player: given }], 'clubs'), x.fame.value * spellWeight(x.spells?.[club]));
  const f = new Map(field.map((x) => [x.id, fact(x)]));
  const checkable = field.filter((x) => x.fame.value >= CHECKABLE);
  const deep = Math.min(...(checkable.length ? checkable : field).map((x) => f.get(x.id)!));
  const above = field.filter((x) => x.id !== pick.id && f.get(x.id)! > f.get(pick.id)!).length;
  return gradeOf(above, field.length, field.length >= ELITE_MIN_FIELD && f.get(pick.id)! <= deep);
}

interface Cand { key: string; date: string; given: Player; club: string; playerFirst: boolean; pick: Player; grade: Grade; old: Grade; via: string; tags: string[] }
const cands: Cand[] = [];
for (const d of days) for (const s of stepsOf(d)) {
  const given = byId.get(s.player)!;
  const members = byClub.get(s.club) ?? [];
  const field = fieldOf(given, members);
  for (const pick of field) {
    const called = ['Viv Anderson'].includes(pick.name);
    if ((views[pick.id] ?? 0) < 150e3 && !called) continue; // nobody names a player nobody reads about
    if (asked.has(pick.id)) continue;
    const j = judge(pick, given, s.club, members, views, bar);
    // A membership with no games behind it is its own open question (Luis Alberto at Barcelona, round 1).
    if (id !== 'steps-1' && (!apps(pick, s.club) || !apps(pick, j.via!) || !apps(given, j.via!))) continue;
    const old = oldGrade(field, pick, given, s.club);
    const shared = pick.clubIds.filter((c) => given.clubIds.includes(c));
    const via = j.via!;
    const tags: string[] = [];
    if (Math.abs(GRADES.indexOf(j.grade!) - GRADES.indexOf(old)) >= 2) tags.push('moved');
    if (shared.every((c) => (apps(given, c) ?? 99) < 30)) tags.push('given-short');
    if ((views[pick.id] ?? 0) > 10 ** (FIT_A + FIT_B * pick.fame.value) * 8) tags.push('views-high');
    const lasts = Object.values(pick.spells ?? {}).map((x) => x[2]);
    if (lasts.length && lasts.every((y) => y !== null && y < 2010)) tags.push('pre-2010');
    if (!english.has(s.club)) tags.push('non-pl');
    if ((ended(pick, s.club) ?? NOW) >= NOW - 1 && (apps(pick, s.club) ?? 99) < 20) tags.push('new-short');
    cands.push({ key: `${d.date}|${s.player}|${s.club}|${pick.id}`, date: d.date, given, club: s.club, playerFirst: s.playerFirst, pick, grade: j.grade!, old, via, tags });
  }
}

// Seeded order, so a rerun gives the same round.
let seed = 0x2545f491;
const rand = () => ((seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) ^ 0x297a2d39) >>> 0) / 4294967296;
const shuffled = cands.map((c) => ({ c, r: rand() })).sort((a, b) => a.r - b.r).map((x) => x.c);
const chosen: Cand[] = [];
const usedPick = new Set<string>();
const usedStep = new Map<string, number>();
const take = (want: (c: Cand) => boolean, n: number) => {
  for (const c of shuffled) {
    if (n === 0) return;
    const step = `${c.date}|${c.given.id}|${c.club}`;
    if (!want(c) || usedPick.has(c.pick.id) || (usedStep.get(step) ?? 0) >= 2) continue;
    chosen.push(c); usedPick.add(c.pick.id); usedStep.set(step, (usedStep.get(step) ?? 0) + 1); n--;
  }
};
/** Judgement calls the diagnosis found (HANDOFF.md), always in the round when their day has been played: [pick, given]. */
const CALLS: [string, string][] = [
  ['Ian Wright', 'Ashley Cole'], ['Viv Anderson', 'Ashley Cole'], ['Pep Guardiola', 'Neymar'],
  ['George Weah', 'Patrick Vieira'], ['David de Gea', 'Rodri'], ['Kevin De Bruyne', 'Andriy Shevchenko'],
  ['Enzo Maresca', 'David de Gea'],
];
for (const [p, g] of CALLS) take((c) => c.pick.name === p && c.given.name === g, 1);
if (id === 'steps-1') {
  take((c) => c.tags.includes('moved'), 7);
  take((c) => c.tags.includes('given-short'), 4);
  take((c) => c.tags.includes('views-high'), 2);
} else {
  take((c) => c.tags.includes('pre-2010'), 6);
  take((c) => c.tags.includes('non-pl') && !c.tags.includes('pre-2010'), 5);
  take((c) => c.tags.includes('new-short'), 3);
  take((c) => c.tags.includes('given-short'), 2);
}
for (const g of GRADES) take((c) => c.grade === g, 2);
if (id !== 'steps-1') for (const g of GRADES.slice(0, 3)) take((c) => c.grade === g, 1); // probes run deep; keep the shallow grades in view
take(() => true, Math.max(0, 30 - chosen.length));

const items = chosen
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((c) => {
    const g = c.given.name, cl = short(c.club), v = short(c.via);
    const here = apps(c.pick, c.club);
    const last = ended(c.pick, c.club);
    // The step as the game shows it, so the pick can stay hidden until tapped.
    const pn = plateName(c.given.id, g), cn = shortClubName(clubs[c.club]?.name ?? c.club);
    return {
      id: c.key.replace(/[^A-Za-z0-9]+/g, '-'),
      kicker: c.playerFirst ? `${g} · ? · ${cl}` : `${cl} · ? · ${g}`,
      title: c.pick.name,
      lines: [
        `Linked by ${v}: ${apps(c.pick, c.via) ?? '?'} games there, ${g.split(' ').at(-1)} ${apps(c.given, c.via) ?? '?'}`,
        `At ${cl}: ${here ?? '?'} league games${last ? `, until ${last}` : ''}`,
      ],
      gap: c.playerFirst ? [pn, cn] : [cn, pn],
      prompt: c.playerFirst ? `Played for one of ${pn}’s clubs and for ${cn}` : `Played for ${cn} and one of ${pn}’s clubs`,
      value: GRADE_WORD[c.grade],
      rank: GRADES.indexOf(c.grade),
      // For reading answers back; the page ignores it.
      meta: { date: c.date, given: c.given.id, club: c.club, pick: c.pick.id, old: c.old, tags: c.tags },
    };
  });

const round = {
  id,
  eyebrow: 'Steps · grade check',
  title: 'Are these grades right?',
  intro: id === 'steps-1'
    ? `${items.length} real picks from Steps days already played. Each one shows the grade the game gives it today. Say whether it should be higher (a deeper cut than that), lower (more obvious than that), or is right. A note is optional.`
    : `${items.length} real picks from Steps days already played. Each step is shown as in the game: think who you would name, then tap the gap to see a pick and the grade the game gives it. Say whether it should be higher (a deeper cut than that), lower (more obvious than that), or is right. A note is optional.`,
  reveal: id !== 'steps-1',
  valueLabel: 'Graded',
  scale: GRADES.map((g) => GRADE_WORD[g]),
  options: [
    { id: 'low', label: 'Too low', hint: 'Deeper than that: it deserves a higher grade' },
    { id: 'right', label: 'Right' },
    { id: 'high', label: 'Too high', hint: 'More obvious than that: it deserves a lower grade' },
  ],
  items,
};
await writeFile(`tools/feedback-round/rounds/${id}.json`, JSON.stringify(round, null, 2) + '\n');
console.log(`${items.length} items from ${days.length} days to tools/feedback-round/rounds/${id}.json`);
for (const it of items) console.log(`  ${it.value.padEnd(6)} (was ${it.meta.old.padEnd(6)}) ${it.title} — ${it.kicker} [${it.meta.tags.join(',')}]`);
