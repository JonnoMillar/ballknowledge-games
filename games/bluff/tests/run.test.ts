import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addDays, composeDay, extend, matchName, molesFor, moleScore, problems, RUN_MOLE_START, type RunMoleDay } from '../lib/run';
import { runMole } from '../server';
import type { Side } from '../lib/types';

const sides = JSON.parse(readFileSync('games/bluff/data/sides.json', 'utf8')) as Side[];
const fame = new Map((JSON.parse(readFileSync('data/pool.json', 'utf8')) as { id: string; fame: { value: number } }[]).map((p) => [p.id, p.fame.value]));
const days = JSON.parse(readFileSync('games/bluff/data/run.json', 'utf8')) as RunMoleDay[];

describe('the mole schedule', () => {
  it('keeps every promise, day after day, from its start', () => {
    expect(days[0]!.date).toBe(RUN_MOLE_START);
    days.forEach((d, i) => {
      if (i > 0) expect(d.date).toBe(addDays(days[i - 1]!.date, 1));
      expect(problems(sides, fame, d, days.slice(0, i))).toEqual([]);
    });
  });

  it('is the same every time it runs, and runs a year on today\'s sides', () => {
    const a = extend(sides, fame, [], addDays(RUN_MOLE_START, 364));
    a.forEach((d, i) => expect(problems(sides, fame, d, a.slice(0, i))).toEqual([]));
    expect(extend(sides, fame, [], addDays(RUN_MOLE_START, 9))).toEqual(a.slice(0, 10));
  });

  it('refuses a day that breaks a rule', () => {
    const d = composeDay(sides, fame, RUN_MOLE_START, []);
    expect(problems(sides, fame, { ...d, at: [0, 0] }, [])).not.toEqual([]);
    const side = sides.find((s) => s.key === d.side)!;
    expect(problems(sides, fame, { ...d, fake: side.lines[1]![0]!.id! }, [])).not.toEqual([]);
    expect(problems(sides, fame, d, [{ ...d, date: addDays(d.date, -1) }])).not.toEqual([]);
  });

  it('never plants a mole more famous than the XI\'s upper quartile', () => {
    const messi = sides.find((s) => s.lines.flat().some((p) => p.name === 'Lionel Messi') && s.date >= '2022')!;
    for (const [l, line] of messi.lines.entries()) line.forEach((_, k) => {
      for (const m of molesFor(messi, [l, k], fame)) expect(fame.get(m.id)!).toBeLessThan(fame.get('Q615')!);
    });
  });

  it('scores 100, 50, 0 and names the match once', () => {
    expect([moleScore([true]), moleScore([false, true]), moleScore([false, false]), moleScore([])]).toEqual([100, 50, 0, 0]);
    expect(matchName({ comp: 'Champions League final', date: '2021-05-29' })).toBe('Champions League final 2021');
    expect(matchName({ comp: 'World Cup 2018, round of 16', date: '2018-06-30' })).toBe('World Cup 2018, round of 16');
  });
});

describe('serving a mole day', () => {
  const d = days[0]!;
  const now = new Date(`${d.date}T12:00:00Z`);
  const wrong: [number, number] = d.at[0] === 1 ? [2, 0] : [1, 0];
  it('shows the mole in place, names only, and never says which until it is over', () => {
    const v = runMole(d.date, [], false, now)!;
    const fake = Object.values(sides.find((s) => s.key === d.side)!.help).flat().find((p) => p!.id === d.fake)!.name;
    expect(v.lines[d.at[0]]![d.at[1]]).toBe(fake);
    expect(v.reveal).toBeNull();
    expect(JSON.stringify(v)).not.toMatch(/"Q\d+"|"id"/);
    expect(runMole(d.date, [wrong], false, now)!.reveal).toBeNull();
  });
  it('reveals on a find, after two taps, or when the clock runs out', () => {
    expect(runMole(d.date, [d.at], false, now)!.taps).toEqual([{ at: d.at, right: true }]);
    expect(runMole(d.date, [d.at], false, now)!.reveal?.fake).toBeTruthy();
    expect(runMole(d.date, [wrong, d.at], false, now)!.reveal).not.toBeNull();
    expect(runMole(d.date, [], true, now)!.reveal).not.toBeNull();
  });
  it('refuses bad taps and days ahead', () => {
    expect(runMole(d.date, [wrong, wrong], false, now)).toBeNull();
    expect(runMole(d.date, [[9, 9]], false, now)).toBeNull();
    expect(runMole(addDays(d.date, 5), [], false, now)).toBeNull();
  });
});
