import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { judge, type Ruler, type Views } from '../../games/step/lib/rules';
import { GRADES, type Grade } from '../../src/lib/chain/grade';
import type { Player } from '../../src/lib/chemistry/types';

/**
 * Jonno's verdicts from the feedback rounds (tools/feedback-round: the
 * rounds, and answers/ as read back from the page), as the grade range each
 * pick should land in. A verdict is relative to the grade the round showed:
 * Right is that grade, Too low anything deeper, Too high anything shallower,
 * unless his note named the grade.
 *
 * Usage: tsx scripts/step/verdicts.ts   (prints every verdict and the misses)
 */
export interface Verdict { round: number; title: string; given: string; club: string; pick: string; lo: number; hi: number }

/** Notes that name a grade, by pick; null drops the verdict (a data fault or a step with no fair answer). */
const NOTED: Record<string, [number, number] | null> = {
  Q96755704: [3, 4], // Mejbri at Sevilla: "sharp at least, if not elite"
  Q317282: [3, 4], // Maresca at Sevilla: "should be sharp"
  Q192175: [2, 2], // Yorke at Sunderland: "should be solid"
  Q64748320: [1, 2], // Durán at Benfica: "at least decent if not solid"
  Q159057: [3, 4], // Schwarzer at Fulham: "maybe elite, maybe sharp"
  Q1083432: [3, 3], // Trippier at Spurs: Elite "slightly generous"
  Q1894: [2, 2], // Depay at United for Rodri: "too high by one"
  Q226125: [4, 4], // Harewood: "never heard of him"
  Q248228: null, // Luis Alberto: Barcelona B, not Barcelona
  Q116753805: null, // Diomande: "how many solutions even are there"
};

export function loadVerdicts(): Verdict[] {
  const out: Verdict[] = [];
  for (const round of [1, 2, 3]) {
    const r = JSON.parse(readFileSync(`tools/feedback-round/rounds/steps-${round}.json`, 'utf8')) as { items: { id: string; title: string; rank: number; meta: { given: string; club: string; pick: string } }[] };
    const answers = JSON.parse(readFileSync(`tools/feedback-round/answers/steps-${round}.json`, 'utf8')) as Record<string, { choice: string | null }>;
    for (const it of r.items) {
      const a = answers[it.id];
      if (!a) continue;
      const g = it.rank;
      let range: [number, number] | null = a.choice === 'right' ? [g, g] : a.choice === 'low' ? [g + 1, 4] : a.choice === 'high' ? [0, g - 1] : null;
      if (it.meta.pick in NOTED) range = NOTED[it.meta.pick]!;
      if (range) out.push({ round, title: it.title, ...it.meta, lo: range[0], hi: range[1] });
    }
  }
  return out;
}

/** Each verdict with the grade the game gives today and how many grades off it is. */
export function scoreVerdicts(pool: readonly Player[], views: Views, ruler: Ruler) {
  const byId = new Map(pool.map((p) => [p.id, p]));
  return loadVerdicts().map((v) => {
    const members = pool.filter((p) => p.clubIds.includes(v.club));
    const grade = judge(byId.get(v.pick)!, byId.get(v.given)!, v.club, members, views, ruler).grade as Grade;
    const g = GRADES.indexOf(grade);
    return { ...v, grade, off: g < v.lo ? v.lo - g : g > v.hi ? g - v.hi : 0 };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
  const views = JSON.parse(readFileSync('data/player-views.json', 'utf8')) as Views;
  const ruler = JSON.parse(readFileSync('games/step/data/ruler.json', 'utf8')) as Ruler;
  const clubs = JSON.parse(readFileSync('data/clubs.json', 'utf8')) as Record<string, { name: string }>;
  const name = (q: string) => pool.find((p) => p.id === q)?.name ?? clubs[q]?.name ?? q;
  const rows = scoreVerdicts(pool, views, ruler);
  for (const r of rows) {
    const want = GRADES[r.lo] + (r.hi !== r.lo ? `..${GRADES[r.hi]}` : '');
    console.log(`${r.off ? `off ${r.off}` : '     '} r${r.round} ${r.grade.padEnd(6)} want ${want.padEnd(13)} ${r.title} (${name(r.given)} · ${name(r.club)})`);
  }
  console.log(`${rows.filter((r) => !r.off).length} of ${rows.length} on target, ${rows.reduce((n, r) => n + r.off, 0)} grades off in all`);
}
