import { describe, expect, it } from 'vitest';
import { classicsFor, dailyPool, daySlugs, fair, isDate } from '../lib/boards';
import type { Goal, Goals } from '../lib/types';

const g = (kind: Goal['kind'], x: number, y: number): Goal => ({
  scorer: 's', match: 'm', date: '2020-01-01', competition: 'c', line: 'l', kind,
  source: kind === 'classic' ? { from: 'statsbomb', matchId: 1, eventId: 'e' } : { from: 'understat', matchId: 1, shotId: 's' },
  at: { x, y }, xg: 0.1,
});
const pool = Array.from({ length: 10 }, (_, i) => `c${i}`);

describe('isDate', () => {
  it('takes real calendar dates only', () => {
    expect(isDate('2026-10-08')).toBe(true);
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('2026-1-8')).toBe(false);
    expect(isDate('../etc')).toBe(false);
  });
});

describe('fair', () => {
  it('rejects a board the lazy pin coasts', () => {
    expect(fair(Array.from({ length: 6 }, () => ({ x: 34, y: 9 })))).toBe(false);
  });
  it('wants goals from in and out of the area', () => {
    expect(fair(Array.from({ length: 6 }, () => ({ x: 34, y: 30 })))).toBe(false);
    expect(fair([{ x: 34, y: 30 }, { x: 34, y: 30 }, { x: 34, y: 30 }, { x: 10, y: 5 }, { x: 34, y: 5 }, { x: 34, y: 5 }])).toBe(true);
  });
});

describe('the daily pool', () => {
  it('is the classics in no pack', () => {
    const goals: Goals = { a: g('classic', 1, 1), b: g('classic', 1, 1), r: g('recent', 1, 1) };
    expect(dailyPool(goals, [{ id: 'p', title: 'P', goals: ['b'] }])).toEqual(['a']);
  });
});

describe('classics for a day', () => {
  it('is the same on every run and moves on each day', () => {
    expect(classicsFor(1, pool)).toEqual(classicsFor(1, [...pool].reverse()));
    expect(classicsFor(1, pool)).not.toEqual(classicsFor(2, pool));
    expect(new Set([...classicsFor(1, pool), ...classicsFor(2, pool)]).size).toBe(4);
  });
  it('wraps when the pool runs out', () => {
    expect(classicsFor(6, pool)).toEqual(classicsFor(1, pool));
  });
});

describe('a day\'s six', () => {
  it('takes the week script\'s board when there is one', () => {
    expect(daySlugs('2026-10-09', { '2026-10-09': ['a', 'b', 'c', 'd', 'e', 'f'] }, pool)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
  it('falls back to six classics, so the daily never goes blank', () => {
    const six = daySlugs('2026-10-09', {}, pool);
    expect(six).toHaveLength(6);
    expect(new Set(six).size).toBe(6);
  });
});
