import { describe, expect, it } from 'vitest';
import { columnSchedule, columnSpecFor } from '../../components/DepthColumn';
import type { SlotOutcome } from '../../src/lib/chain/result';
import type { Player } from '../../src/lib/chemistry/types';

/**
 * The sealed sheet's timing and geometry.
 *
 * None of this is observable in an automated browser — requestAnimationFrame
 * does not run in a hidden tab, and the countdown is a chain of timers whose
 * whole point is when it stops — so the numbers are pinned here instead.
 */

describe('the column', () => {
  it('ticks at a constant, readable rate on a small field', () => {
    const s = columnSchedule({ score: 64, rank: 6, fieldSize: 16 });
    expect(s.ticks).toBe(10);
    expect(s.every).toBe(150);
  });

  it('is a blur that ends on a wide field rather than an afternoon', () => {
    const s = columnSchedule({ score: 30, rank: 180, fieldSize: 254 });
    expect(s.ticks).toBe(74);
    expect(s.every).toBe(46);
    expect(s.total).toBeLessThan(4500);
  });

  it('stops almost at once on a famous pick, which is the joke', () => {
    const s = columnSchedule({ score: 3, rank: 254, fieldSize: 254 });
    expect(s.ticks).toBe(0);
    expect(s.total).toBe(380 + 260);
  });

  it('has a fixed length for a pick that did not link', () => {
    expect(columnSchedule(null).ticks).toBe(0);
    expect(columnSchedule({ score: 0, rank: null, fieldSize: 16 }).total).toBe(420);
  });
});

describe('the floor', () => {
  const player = (id: string, name: string): Player =>
    ({ id, name, clubIds: [], fame: { value: 50 }, nation: null, positions: [] } as unknown as Player);
  const pool = new Map([['me', player('me', 'Gerard Deulofeu')], ['best', player('best', 'Sylvain Distin')]]);
  const outcome = (over: Partial<SlotOutcome>): SlotOutcome => ({
    index: 1, playerId: 'me', held: true, clueMet: true, obvious: null,
    depth: { score: 64, rank: 6, fieldSize: 16 },
    best: { id: 'best', name: 'Sylvain Distin', score: 84, clubs: [] },
    fieldSize: 16,
    ...over,
  });

  it('is the deepest answer when the player was not it', () => {
    const c = columnSpecFor(outcome({}), pool, {});
    expect(c.floor).toEqual({ id: 'best', name: 'Distin', score: 84, mine: false });
    expect(c.depth?.rank).toBe(6);
  });

  it('is the player themselves at rank 1, whatever the fame floor says', () => {
    // `best` applies a fame floor the field does not, so they can disagree.
    // A pick ranked 1 against the field IS the floor of that field.
    const c = columnSpecFor(outcome({ depth: { score: 100, rank: 1, fieldSize: 16 } }), pool, {});
    expect(c.floor).toEqual({ id: 'me', name: 'Deulofeu', score: 100, mine: true });
  });

  it('is the player themselves when best is their pick', () => {
    const c = columnSpecFor(outcome({ best: { id: 'me', name: 'Gerard Deulofeu', score: 64, clubs: [] } }), pool, {});
    expect(c.floor?.mine).toBe(true);
    expect(c.floor?.name).toBe('Deulofeu');
  });

  it('runs no countdown for a pick that did not link, but still names the floor', () => {
    const c = columnSpecFor(outcome({ held: false, depth: null }), pool, {});
    expect(c.depth).toBeNull();
    expect(c.floor?.name).toBe('Distin');
  });
});
