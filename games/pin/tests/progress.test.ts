import { beforeEach, describe, expect, it } from 'vitest';
import { nextPack, packStatus, readStore, recordThrow, type Throw } from '../lib/progress';

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

describe('pack status', () => {
  it('is unplayed with nothing saved, or with a save of another length', () => {
    expect(packStatus(undefined, 6)).toEqual({ state: 'unplayed' });
    recordThrow('p', 2, 0, t(1), '2026-10-09');
    expect(packStatus(readStore().p, 3)).toEqual({ state: 'unplayed' });
  });
  it('counts a part-thrown pack', () => {
    recordThrow('p', 3, 0, t(1), '2026-10-09');
    recordThrow('p', 3, 2, t(2), '2026-10-09');
    expect(packStatus(readStore().p, 3)).toEqual({ state: 'part', thrown: 2 });
  });
  it('gives the distances of a finished pack', () => {
    recordThrow('p', 2, 0, t(1), '2026-10-09');
    recordThrow('p', 2, 1, t(2), '2026-10-09');
    expect(packStatus(readStore().p, 2)).toEqual({ state: 'done', distances: [1, 2] });
  });
});

describe('the next pack', () => {
  const order = [{ id: 'a', size: 1 }, { id: 'b', size: 1 }, { id: 'c', size: 1 }];
  it('is the next unfinished pack after this one, wrapping round', () => {
    recordThrow('b', 1, 0, t(1), '2026-10-09');
    expect(nextPack(order, readStore(), 'a')).toBe('c');
    expect(nextPack(order, readStore(), 'c')).toBe('a');
  });
  it('is null when every other pack is finished', () => {
    for (const id of ['a', 'b', 'c']) recordThrow(id, 1, 0, t(1), '2026-10-09');
    expect(nextPack(order, readStore(), 'a')).toBeNull();
  });
});
