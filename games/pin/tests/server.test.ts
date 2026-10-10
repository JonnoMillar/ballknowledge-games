import { describe, expect, it } from 'vitest';
import { boardView, judge, library, parseThrow } from '../server';
import { distance, SPOT } from '../lib/pitch';

const NOW = new Date('2026-10-09T12:00:00Z');

describe('board views', () => {
  it('ship a pack without its answers', () => {
    const b = boardView('lionesses')!;
    expect(b.goals).toHaveLength(6);
    expect(b.title).toBe('Lionesses');
    expect(JSON.stringify(b)).not.toMatch(/"at"|"xg"|"source"|"eventId"/);
    expect(b.kind).toBe('classic');
  });
  it('refuse nonsense ids', () => {
    for (const id of ['', 'nope', 'pack:lionesses', '../goals', '__proto__', 'constructor', '2026-10-08']) {
      expect(boardView(id), id).toBeNull();
    }
  });
});

describe('the library', () => {
  it('shelves every pack once, with no answers', () => {
    const shelves = library(NOW);
    const ids = shelves.flatMap((s) => s.packs.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('lionesses');
    expect(ids).toContain('champions-league-finals');
    expect(shelves.map((s) => s.title)).toEqual(['This season', 'Classics', 'By season', 'By club']);
    expect(JSON.stringify(shelves)).not.toMatch(/"at"|"xg"|"goals"|"source"/);
  });
  it('never marks an archive or classic pack new', () => {
    for (const s of library(NOW)) for (const p of s.packs) if (p.kind !== 'round' && p.kind !== 'month') expect(p.isNew, p.id).toBe(false);
  });
});

describe('judging a throw', () => {
  it('returns the answer for a goal in the pack', () => {
    const slug = boardView('lionesses')!.goals[0]!.slug;
    const a = judge({ board: 'lionesses', goal: slug, pin: SPOT })!;
    expect(a.distance).toBeCloseTo(distance(SPOT, a.at));
    expect(a.credit).toBe('statsbomb');
    expect(a.xg).toBeGreaterThan(0);
  });
  it('will not judge a goal that is not in the pack, or a pack that does not exist', () => {
    expect(judge({ board: 'lionesses', goal: 'bale-overhead-2018', pin: SPOT })).toBeNull();
    expect(judge({ board: 'pack:lionesses', goal: 'russo-backheel', pin: SPOT })).toBeNull();
  });
});

describe('parsing a throw', () => {
  it('takes a clean throw', () => {
    expect(parseThrow({ board: 'x', goal: 'g', x: 1, y: 2 })).toEqual({ board: 'x', goal: 'g', pin: { x: 1, y: 2 } });
  });
  it('refuses anything else', () => {
    const bad = [null, 'x', [], { board: 1, goal: 'g', x: 1, y: 1 }, { board: 'b', goal: 'g', x: '1', y: 1 },
      { board: 'b', goal: 'g', x: Number.NaN, y: 1 }, { board: 'b', goal: 'g', x: 70, y: 1 }, { board: 'b', goal: 'g', x: 1, y: -1 },
      { board: 'b'.repeat(41), goal: 'g', x: 1, y: 1 }];
    for (const b of bad) expect(parseThrow(b), JSON.stringify(b)).toBeNull();
  });
});
