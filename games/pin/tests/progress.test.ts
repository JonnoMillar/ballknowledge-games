import { beforeEach, describe, expect, it } from 'vitest';
import { nextPack, packStatus, readStore, record, recordThrow, standing, suggest, type Throw } from '../lib/progress';

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

describe('the record', () => {
  const cards = [{ id: 'a', size: 2 }, { id: 'b', size: 1 }, { id: 'c', size: 1 }];
  it('is empty before a pack is finished', () => {
    recordThrow('a', 2, 0, t(1), '2026-10-10');
    expect(record(readStore(), cards)).toMatchObject({ packs: 0, average: null, best: null });
  });
  it('averages and bests the finished packs, ignoring a save of another size', () => {
    recordThrow('a', 2, 0, t(1), '2026-10-10');
    recordThrow('a', 2, 1, t(5), '2026-10-10'); // 100 and 69: 84
    recordThrow('b', 1, 0, t(10), '2026-10-10'); // 37
    recordThrow('c', 2, 0, t(0), '2026-10-10'); // a save of size 2 for a pack of 1
    const r = record(readStore(), cards);
    expect(r).toMatchObject({ packs: 2, average: 61, best: 84 });
    expect([...r.scores]).toEqual([['a', 84], ['b', 37]]);
  });
  it('places a score among the others, ties sharing', () => {
    expect(standing([84, 37, 70], 84)).toBe(1);
    expect(standing([84, 37, 70], 70)).toBe(2);
    expect(standing([84, 84, 37], 84)).toBe(1);
  });
});

describe('the suggested pack', () => {
  const order = [{ id: 'a', size: 1 }, { id: 'b', size: 2 }, { id: 'c', size: 1 }];
  it('is the first pack with nothing thrown', () => {
    expect(suggest(order, readStore())).toEqual({ id: 'a', state: 'fresh' });
    recordThrow('a', 1, 0, t(1), '2026-10-10');
    expect(suggest(order, readStore())).toEqual({ id: 'b', state: 'fresh' });
  });
  it('is a pack in progress before any fresh one', () => {
    recordThrow('b', 2, 0, t(1), '2026-10-10');
    expect(suggest(order, readStore())).toEqual({ id: 'b', state: 'part' });
  });
  it('is null when every pack is finished', () => {
    recordThrow('a', 1, 0, t(1), '2026-10-10');
    recordThrow('b', 2, 0, t(1), '2026-10-10');
    recordThrow('b', 2, 1, t(1), '2026-10-10');
    recordThrow('c', 1, 0, t(1), '2026-10-10');
    expect(suggest(order, readStore())).toBeNull();
  });
});
