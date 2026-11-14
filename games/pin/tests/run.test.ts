import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addDays, composeDay, extend, problems, RUN_PIN_START, seasonStart, type RunPinDay } from '../lib/run';
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
