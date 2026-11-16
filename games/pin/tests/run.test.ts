import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addDays, composeDay, extend, memorable, problems, RUN_CLUES, RUN_PIN_FAME_FROM, RUN_PIN_START, runLine, seasonStart, type RunPinDay } from '../lib/run';
import { boardView, judge } from '../server';
import type { Goals } from '../lib/types';
import config from '../../../next.config';

const goals = JSON.parse(readFileSync('games/pin/data/goals.json', 'utf8')) as Goals;
const days = JSON.parse(readFileSync('games/pin/data/run.json', 'utf8')) as RunPinDay[];

describe('the run schedule', () => {
  it('keeps every promise, day after day, from its start', () => {
    expect(days[0]!.date).toBe(RUN_PIN_START);
    days.forEach((d, i) => {
      if (i > 0) expect(d.date).toBe(addDays(days[i - 1]!.date, 1));
      expect(problems(goals, d, days.slice(0, i))).toEqual([]);
    });
  });

  it('is the same every time it runs, and runs half a year on today\'s goals with no new ones', () => {
    const a = extend(goals, [], addDays(RUN_PIN_START, 181));
    expect(a).toHaveLength(182);
    a.forEach((d, i) => expect(problems(goals, d, a.slice(0, i))).toEqual([]));
    // The first seven weeks need no relaxing.
    expect(a.slice(0, 50).every((d) => d.gap === undefined)).toBe(true);
    expect(extend(goals, [], addDays(RUN_PIN_START, 9))).toEqual(a.slice(0, 10));
  });

  it('refuses a day that breaks a rule', () => {
    const d = composeDay(goals, RUN_PIN_START, []);
    expect(problems(goals, { ...d, goals: [d.goals[0]!, d.goals[0]!, d.goals[1]!] }, [])).not.toEqual([]);
    expect(problems(goals, d, [{ date: addDays(RUN_PIN_START, -1), goals: [d.goals[0]!] }])).not.toEqual([]);
  });

  it('picks only memorable goals from the day the rule began, and keeps half a year going', () => {
    const ok = memorable(goals, JSON.parse(readFileSync('data/pool.json', 'utf8')), JSON.parse(readFileSync('data/player-views.json', 'utf8')));
    expect(ok.size).toBeGreaterThan(100);
    expect([...ok].some((s) => goals[s]!.scorer === 'Jens Cajuste')).toBe(false);
    days.forEach((d, i) => expect(problems(goals, d, days.slice(0, i), ok)).toEqual([]));
    expect(days.some((d) => d.date >= RUN_PIN_FAME_FROM)).toBe(true);
    const kept = days.filter((d) => d.date < RUN_PIN_FAME_FROM);
    const a = extend(goals, kept, addDays(RUN_PIN_FAME_FROM, 181), ok);
    a.forEach((d, i) => expect(problems(goals, d, a.slice(0, i), ok)).toEqual([]));
  });

  it('says when and why a goal mattered, never how or from where', () => {
    expect(runLine('x', { kind: 'recent', line: 'A shot from a corner, in the 90th minute, to make it 1–1.' })).toBe('In the 90th minute, to make it 1–1.');
    for (const [slug, g] of Object.entries(goals)) {
      if (g.kind === 'classic') expect(RUN_CLUES[slug], slug).toBeTruthy();
      expect(runLine(slug, g)).not.toMatch(/header|free kick|corner|volley|lob|curl|drive|strike|backheel|overhead|bicycle|scissor|solo|slalom|run from|half-volley|chip|dribble|cross|penalty/i);
    }
  });

  it('starts seasons on 1 August', () => {
    expect(seasonStart('2026-11-13')).toBe('2026-08-01');
    expect(seasonStart('2027-03-01')).toBe('2026-08-01');
  });
});

describe('serving a run day', () => {
  const d = days[0]!;
  it('serves the goals without answers, judges throws, and hides days ahead', () => {
    const v = boardView(`run:${d.date}`, new Date(`${d.date}T12:00:00Z`))!;
    expect(v.goals.map((g) => g.slug)).toEqual(d.goals);
    expect(JSON.stringify(v)).not.toContain('"at"');
    expect(judge({ board: `run:${d.date}`, goal: d.goals[0]!, pin: { x: 34, y: 11 } }, new Date(`${d.date}T12:00:00Z`))?.at).toEqual(goals[d.goals[0]!]!.at);
    expect(boardView(`run:${addDays(d.date, 5)}`, new Date(`${d.date}T12:00:00Z`))).toBeNull();
  });
  it('is traced for production', () => {
    expect(config.outputFileTracingIncludes?.['/**']).toContain('./games/pin/data/run.json');
  });
});
