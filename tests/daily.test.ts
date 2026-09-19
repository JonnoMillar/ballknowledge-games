import { describe, it, expect } from 'vitest';
import { boardForDay, dailyOrder, dateOfDay, dayNumber, dayOfBoard, EPOCH } from '../src/lib/daily';
import { streakOf, type Progress } from '../src/lib/progress';

const ids = ['010', '011', '012', '013', '014'];

describe('the daily', () => {
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

  it('gives every day a board and wraps when the set runs out', () => {
    const seen = new Set<string>();
    for (let d = 1; d <= ids.length; d++) seen.add(boardForDay(d, ids)!);
    expect(seen.size).toBe(ids.length);
    expect(boardForDay(ids.length + 1, ids)).toBe(boardForDay(1, ids));
    expect(boardForDay(0, ids)).toBeNull();
  });

  it('knows which day a board was the daily', () => {
    const today = 7;
    for (let d = 1; d <= today; d++) {
      const id = boardForDay(d, ids)!;
      const day = dayOfBoard(id, ids, today);
      expect(day).not.toBeNull();
      expect(boardForDay(day!, ids)).toBe(id);
      expect(day!).toBeLessThanOrEqual(today);
    }
  });
});

describe('the streak', () => {
  const play = (day: number, held: boolean) => ({ day, held, links: [held], tiers: [], date: 'x' });
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
    const p: Progress = { plays: { a: { day: null, held: true, links: [true], tiers: [], date: 'x' } } };
    expect(streakOf(p, 1)).toEqual({ current: 0, best: 0 });
  });
});
