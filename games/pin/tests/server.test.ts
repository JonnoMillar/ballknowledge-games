import { describe, expect, it } from 'vitest';
import { boardView, judge, packList, parseThrow } from '../server';
import { distance, SPOT } from '../lib/pitch';

const NOW = new Date('2026-10-08T12:00:00Z');

describe('board views', () => {
  it('ship a pack without its answers', () => {
    const b = boardView('pack:lionesses', NOW)!;
    expect(b.goals).toHaveLength(6);
    expect(b.title).toBe('Lionesses');
    expect(JSON.stringify(b)).not.toMatch(/"at"|"xg"|"source"|"eventId"/);
    expect(b.par.metres).toBeGreaterThanOrEqual(42);
  });
  it('ship today and tomorrow, never later and never before launch', () => {
    expect(boardView('2026-10-08', NOW)?.title).toBe('No. 1');
    expect(boardView('2026-10-09', NOW)?.number).toBe(2);
    expect(boardView('2026-10-10', NOW)).toBeNull();
    expect(boardView('2026-10-07', NOW)).toBeNull();
  });
  it('refuse nonsense ids', () => {
    for (const id of ['', 'pack:nope', '2026-13-01', '../goals', 'pack:../x']) expect(boardView(id, NOW), id).toBeNull();
  });
  it('list the packs', () => {
    expect(packList().map((p) => p.id)).toEqual(['world-cup-2022', 'invincibles', 'lionesses']);
  });
});

describe('judging a throw', () => {
  it('returns the answer for a goal on the board', () => {
    const slug = boardView('pack:lionesses', NOW)!.goals[0]!.slug;
    const a = judge({ board: 'pack:lionesses', goal: slug, pin: SPOT }, NOW)!;
    expect(a.distance).toBeCloseTo(distance(SPOT, a.at));
    expect(a.credit).toBe('statsbomb');
    expect(a.xg).toBeGreaterThan(0);
  });
  it('will not judge a goal that is not on the board', () => {
    expect(judge({ board: 'pack:lionesses', goal: 'bale-overhead-2018', pin: SPOT }, NOW)).toBeNull();
  });
  it('will not judge a board from the future', () => {
    const slug = boardView('2026-10-09', NOW)!.goals[0]!.slug;
    expect(judge({ board: '2026-10-11', goal: slug, pin: SPOT }, NOW)).toBeNull();
  });
});

describe('parsing a throw', () => {
  it('takes a clean throw', () => {
    expect(parseThrow({ board: 'pack:x', goal: 'g', x: 1, y: 2 })).toEqual({ board: 'pack:x', goal: 'g', pin: { x: 1, y: 2 } });
  });
  it('refuses anything else', () => {
    const bad = [null, 'x', [], { board: 1, goal: 'g', x: 1, y: 1 }, { board: 'b', goal: 'g', x: '1', y: 1 },
      { board: 'b', goal: 'g', x: Number.NaN, y: 1 }, { board: 'b', goal: 'g', x: 70, y: 1 }, { board: 'b', goal: 'g', x: 1, y: -1 },
      { board: 'b'.repeat(41), goal: 'g', x: 1, y: 1 }];
    for (const b of bad) expect(parseThrow(b), JSON.stringify(b)).toBeNull();
  });
});
