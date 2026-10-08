import { beforeEach, describe, expect, it } from 'vitest';
import { readStore, recordThrow, streakOf, type Throw } from '../lib/progress';

const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;
beforeEach(() => mem.clear());

const t = (d: number): Throw => ({
  pin: { x: 34, y: 11 },
  answer: { at: { x: 34, y: 11 + d }, distance: d, mirrored: null, xg: 0.1, credit: 'statsbomb' },
});
const finish = (date: string, on: string) => { recordThrow(date, 1, 0, t(1), on); };

describe('throws', () => {
  it('keeps the first throw at a goal', () => {
    recordThrow('2026-10-08', 2, 0, t(1), '2026-10-08');
    const s = recordThrow('2026-10-08', 2, 0, t(9), '2026-10-08');
    expect(s['2026-10-08']!.throws[0]!.answer.distance).toBe(1);
    expect(s['2026-10-08']!.finished).toBeNull();
  });
  it('marks a board finished on the day its last pin lands, and resumes', () => {
    recordThrow('2026-10-08', 2, 0, t(1), '2026-10-08');
    recordThrow('2026-10-08', 2, 1, t(2), '2026-10-08');
    expect(readStore()['2026-10-08']!.finished).toBe('2026-10-08');
    expect(readStore()['2026-10-08']!.throws.every(Boolean)).toBe(true);
  });
  it('survives junk in storage', () => {
    mem.set('pin.progress.v1', '{not json');
    expect(readStore()).toEqual({});
  });
});

describe('the streak', () => {
  it('counts dailies finished on their own day, ending today or yesterday', () => {
    finish('2026-10-08', '2026-10-08');
    finish('2026-10-09', '2026-10-09');
    finish('2026-10-10', '2026-10-10');
    const s = readStore();
    expect(streakOf(s, '2026-10-10')).toBe(3);
    expect(streakOf(s, '2026-10-11')).toBe(3);
    expect(streakOf(s, '2026-10-12')).toBe(0);
  });
  it('does not count a daily caught up on later, or a pack', () => {
    finish('2026-10-08', '2026-10-09');
    finish('pack:lionesses', '2026-10-09');
    expect(streakOf(readStore(), '2026-10-09')).toBe(0);
  });
});
