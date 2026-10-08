/**
 * Pitch pin's classics. For each hand-picked goal in
 * games/pin/data/classics.source.json, load its StatsBomb event file, find
 * the goal, and write its spot and xG into games/pin/data/goals.json.
 * Recent goals already in the file are kept.
 *
 *   npx tsx scripts/fetch-pin-classics.ts
 *
 * StatsBomb open data is for research, credited with their logo, and not to
 * be redistributed: only the chosen goals' spots are committed.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fromStatsBomb, round1 } from '../games/pin/lib/pitch';
import type { Goal, Goals } from '../games/pin/lib/types';

interface Source {
  slug: string; scorer: string; match: string; date: string; competition: string; line: string;
  matchId: number; player: string; minute: number;
}
interface SbEvent {
  id: string;
  type: { name: string };
  minute: number;
  player?: { name: string };
  location?: [number, number];
  shot?: { outcome: { name: string }; type: { name: string }; statsbomb_xg: number };
}

const BASE = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data/events';
const GOALS = 'games/pin/data/goals.json';

const sources = JSON.parse(await readFile('games/pin/data/classics.source.json', 'utf8')) as Source[];
const existing = JSON.parse(await readFile(GOALS, 'utf8')) as Goals;
const out: Goals = Object.fromEntries(Object.entries(existing).filter(([, g]) => g.kind !== 'classic'));
const events = new Map<number, SbEvent[]>();
const problems: string[] = [];

for (const s of sources) {
  if (!events.has(s.matchId)) {
    const res = await fetch(`${BASE}/${s.matchId}.json`);
    if (!res.ok) throw new Error(`${s.slug}: events ${s.matchId} gave ${res.status}`);
    events.set(s.matchId, (await res.json()) as SbEvent[]);
  }
  const hits = events.get(s.matchId)!.filter((e) =>
    e.type.name === 'Shot' && e.shot?.outcome.name === 'Goal' && e.minute === s.minute && e.player?.name.includes(s.player));
  if (hits.length !== 1) { problems.push(`${s.slug}: ${hits.length} goals by "${s.player}" in minute ${s.minute}`); continue; }
  const e = hits[0]!;
  if (e.shot!.type.name === 'Penalty') { problems.push(`${s.slug}: a penalty`); continue; }
  const at = fromStatsBomb(e.location![0], e.location![1]);
  const goal: Goal = {
    scorer: s.scorer, match: s.match, date: s.date, competition: s.competition, line: s.line, kind: 'classic',
    source: { from: 'statsbomb', matchId: s.matchId, eventId: e.id },
    at: { x: round1(at.x), y: round1(at.y) },
    xg: Math.round(e.shot!.statsbomb_xg * 100) / 100,
  };
  out[s.slug] = goal;
  console.log(`${s.slug.padEnd(26)} x ${goal.at.x}  y ${goal.at.y}  xG ${goal.xg}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
await writeFile(GOALS, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${sources.length} classics written to ${GOALS}`);
