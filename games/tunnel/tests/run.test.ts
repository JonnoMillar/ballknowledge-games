import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildWorld, type Inputs } from '../lib/day';
import { addDays, composeDay, extend, problems, RUN_ORDER_START, type RunOrderDay } from '../lib/run';
import { runOrder } from '../run/server';

const json = <T,>(f: string) => JSON.parse(readFileSync(f, 'utf8')) as T;
const world = buildWorld({
  pool: json<Inputs['pool']>('data/pool.json'),
  careers: json<{ players: Inputs['careers'] }>('data/careers.json').players,
  facts: json<Inputs['facts']>('games/tunnel/data/facts.json'),
});
const days = json<RunOrderDay[]>('games/tunnel/data/run.json');

describe('the line-up schedule', () => {
  it('keeps every promise, day after day, from its start', () => {
    expect(days[0]!.date).toBe(RUN_ORDER_START);
    days.forEach((d, i) => {
      if (i > 0) expect(d.date).toBe(addDays(days[i - 1]!.date, 1));
      expect(problems(world, d, days.slice(0, i))).toEqual([]);
    });
  });

  it('is the same every time it runs, and runs half a year', () => {
    const a = extend(world, [], addDays(RUN_ORDER_START, 181));
    a.forEach((d, i) => expect(problems(world, d, a.slice(0, i))).toEqual([]));
    expect(extend(world, [], addDays(RUN_ORDER_START, 9))).toEqual(a.slice(0, 10));
  });

  it('refuses a day that breaks a rule', () => {
    const d = composeDay(world, RUN_ORDER_START, []);
    expect(problems(world, { ...d, values: { ...d.values, height: d.values.height.map(() => 180) } }, [])).not.toEqual([]);
    expect(problems(world, d, [{ ...d, date: addDays(d.date, -1), club: 'none' }])).not.toEqual([]);
    expect(problems(world, { ...d, players: [d.players[0]!, ...d.players.slice(0, 4)] }, [])).not.toEqual([]);
  });
});

describe('serving a line-up day', () => {
  const d = days[0]!;
  const now = new Date(`${d.date}T12:00:00Z`);
  it('holds the values back until a line is locked', async () => {
    const v = (await runOrder(d.date, [], now))!;
    expect(v.players.map((p) => p.id)).toEqual(d.players);
    expect(v.values).toEqual([]);
    expect((await runOrder(d.date, [[0, 1, 2, 3, 4]], now))!.values).toEqual([d.values.age]);
    expect((await runOrder(d.date, [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0]], now))!.values).toEqual([d.values.age, d.values.height]);
  });
  it('refuses bad lines and days ahead', async () => {
    expect(await runOrder(d.date, [[0, 0, 1, 2, 3]], now)).toBeNull();
    expect(await runOrder(d.date, [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], now)).toBeNull();
    expect(await runOrder(addDays(d.date, 5), [], now)).toBeNull();
  });
});
