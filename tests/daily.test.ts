import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { boardForDay, dailyOrder, dateOfDay, dayNumber, dayOfBoard, EPOCH, PINNED, schedule, type DailyBoard } from '../src/lib/daily';
import type { ChainPuzzle } from '../src/lib/chain/types';
import { streakOf, type Progress } from '../src/lib/progress';
import type { PlateMark } from '../src/lib/chain/share';

const ids = ['010', '011', '012', '013', '014'];

describe('the daily', () => {
  it('counts from another epoch when given one, and Chain is unchanged', () => {
    expect(dayNumber('2026-10-08', '2026-10-08')).toBe(1);
    expect(dayNumber('2026-10-10', '2026-10-08')).toBe(3);
    expect(dateOfDay(3, '2026-10-08')).toBe('2026-10-10');
    expect(dayNumber('2026-09-19')).toBe(1);
    expect(dateOfDay(1)).toBe('2026-09-19');
  });

  it('starts at day 1 on the epoch and counts up', () => {
    expect(dayNumber(EPOCH)).toBe(1);
    expect(dayNumber('2026-09-20')).toBe(2);
    expect(dateOfDay(2)).toBe('2026-09-20');
    expect(dateOfDay(dayNumber('2027-01-01'))).toBe('2027-01-01');
  });

  it('is the same order on every machine and not the file order', () => {
    const a = dailyOrder(ids);
    const b = dailyOrder([...ids].reverse());
    expect(a).toEqual(b);
    expect(a).not.toEqual(ids);
    expect([...a].sort()).toEqual(ids);
  });
});

/** The 57 daily boards on the day the schedule was pinned (2026-10-20). */
const LAUNCH = [
  '010', '011', '013', '014', '015', '016', '017', '020', '021', '022', '023', '024', '025', '026', '027',
  '029', '030', '031', '032', '033', '034', '035', '036', '037', '038', '039', '041', '042', '043', '044',
  '045', '046', '047', '048', '049', '050', '051', '052', '053', '054', '055', '056', '057', '058', '059',
  '060', '061', '062', '063', '064', '065', '066', '067', '068', '069', '070', '071',
];
const launch: DailyBoard[] = LAUNCH.map((id) => ({ id }));

describe('the schedule', () => {
  it('pins what was actually served: the old shuffle of the launch set, days 1 to 34', () => {
    expect(PINNED).toEqual(dailyOrder(LAUNCH).slice(0, 34));
    expect(schedule(launch, 34)).toEqual(PINNED);
  });

  it('gives every live board a turn before any repeats, unserved boards first', () => {
    const days = schedule(launch, 120);
    const firstCycle = days.slice(0, LAUNCH.length);
    expect(new Set(firstCycle).size).toBe(LAUNCH.length);
    expect(days.every((d) => d !== null)).toBe(true);
    for (let i = 1; i < days.length; i++) expect(days[i]).not.toBe(days[i - 1]);
  });

  it('never moves a day before a board is added or retired', () => {
    const before = schedule(launch, 200);
    const added = schedule([...launch, { id: '090', from: dateOfDay(70) }], 200);
    expect(added.slice(0, 69)).toEqual(before.slice(0, 69));
    expect(added.slice(69)).toContain('090');
    const retired = schedule(launch.map((b) => (b.id === '011' ? { ...b, until: dateOfDay(45) } : b)), 200);
    expect(retired.slice(0, 44)).toEqual(before.slice(0, 44));
    expect(retired.slice(44)).not.toContain('011');
  });

  it('lets a retired board keep its past days', () => {
    const retired = schedule(launch.map((b) => (b.id === '010' ? { ...b, until: '2026-10-21' } : b)), 300);
    expect(retired[30]).toBe('010');                       // day 31, 19 Oct
    expect(retired.slice(34)).not.toContain('010');
  });

  it('knows which day a board was the daily', () => {
    const today = 60;
    const days = schedule(launch, today);
    for (let d = 1; d <= today; d++) {
      const day = dayOfBoard(days[d - 1]!, launch, today)!;
      expect(boardForDay(day, launch)).toBe(days[d - 1]);
      expect(day).toBeGreaterThanOrEqual(d);
      expect(day).toBeLessThanOrEqual(today);
    }
    expect(boardForDay(0, launch)).toBeNull();
  });
});

describe.skipIf(!existsSync('content/chains'))('the schedule against the boards on disk', () => {
  const files = readdirSync('content/chains').filter((f) => /^\d{3}\.json$/.test(f));
  const boards = files
    .map((f) => JSON.parse(readFileSync(`content/chains/${f}`, 'utf8')) as ChainPuzzle)
    .filter((c) => c.difficulty === undefined && !c.deep);

  it('still has every board a past day served', () => {
    const ids = new Set(boards.map((b) => b.id));
    for (const id of PINNED) expect(ids.has(id), `${id} was served and must stay (retire with until)`).toBe(true);
  });

  it('dates every board added after the pin, so it cannot rewrite a served day', () => {
    for (const b of boards) if (!LAUNCH.includes(b.id)) expect(b.from, `${b.id} needs "from"`).toBeDefined();
  });

  it('has a board for every day of the next two years', () => {
    const days = schedule(boards, dayNumber('2028-10-20'));
    expect(days.indexOf(null)).toBe(-1);
  });
});

describe('the streak', () => {
  const play = (day: number, held: boolean) => ({ day, held, links: [held], plates: [held ? 'held' : 'missed'] as PlateMark[], date: 'x' });
  it('counts consecutive held days ending today or yesterday', () => {
    const p: Progress = { plays: { a: play(3, true), b: play(4, true), c: play(5, true) } };
    expect(streakOf(p, 5).current).toBe(3);
    expect(streakOf(p, 6).current).toBe(3);
    expect(streakOf(p, 7).current).toBe(0);
  });
  it('ends on a broken day and remembers the best', () => {
    const p: Progress = { plays: { a: play(1, true), b: play(2, true), c: play(3, false), d: play(4, true) } };
    expect(streakOf(p, 4)).toEqual({ current: 1, best: 2 });
  });
  it('ignores boards not played as the daily', () => {
    const p: Progress = { plays: { a: { day: null, held: true, links: [true], plates: ['held'], date: 'x' } } };
    expect(streakOf(p, 1)).toEqual({ current: 0, best: 0 });
  });
});
