import { describe, it, expect } from 'vitest';
import {
  batter, dealt, newMatch, next, phase, pitched, rematch, strike, swung, total,
  type Match, type Pitch, type Verdict,
} from '../../src/lib/slugger/match';
import type { Bases } from '../../src/lib/slugger/grade';

const club = (id: string) => ({ id, name: id, crest: false });
const fast: Pitch = { ...club('BARCA'), kind: 'fastball' };
const curve: Pitch = { ...club('LEICESTER'), kind: 'curveball' };
const knuckle: Pitch = { ...club('BOLTON'), kind: 'knuckleball' };
const hand = [fast, curve, knuckle];

const hitOf = (id: string, bases: Bases): Verdict =>
  ({ verdict: 'hit', player: { id, name: id }, bases, apps: 10, club: club('X') });
const missOf = (id: string): Verdict =>
  ({ verdict: 'miss', player: { id, name: id }, clubs: [club('Y')] });

const start = (innings = 3) =>
  newMatch({ innings, clock: 30 }, [{ name: 'Away', lineup: ['Jonno'] }, { name: 'Home', lineup: ['Dave', 'Sam'] }]);

/** Deal, pitch and swing in one, alternating kinds so the pitch is always legal. */
let k = 0;
/** Any pitch the pitcher is allowed to throw next. */
const legal = (m: Match): Pitch => hand.find((p) => p.kind !== m.lastKind)!;
const swing = (m: Match, v: Verdict): Match => { k++; return next(swung(pitched(dealt(m, hand), legal(m)), v)); };
const whiff = (m: Match): Match => swing(m, missOf(`miss${k}`));
const out = (m: Match): Match => whiff(whiff(whiff(m)));

describe('the shape of a match', () => {
  it('starts top of the first with the away side due up', () => {
    const m = start();
    expect(phase(m)).toBe('deal');
    expect(m.inning).toBe(1);
    expect(m.half).toBe('top');
    expect(batter(m)).toEqual({ side: 0, name: 'Jonno' });
    expect(m.runs).toEqual([[0, 0, 0], [0, 0, 0]]);
  });

  it('a side with no lineup bats under its own name', () => {
    const m = newMatch({ innings: 3, clock: 0 }, [{ name: 'Us', lineup: [] }, { name: 'Them', lineup: ['  '] }]);
    expect(m.sides[0].lineup).toEqual(['Us']);
    expect(m.sides[1].lineup).toEqual(['Them']);
  });

  it('the pitcher cannot throw the same kind twice in a row in one at-bat', () => {
    let m = pitched(dealt(start(), hand), knuckle);
    expect(phase(m)).toBe('swing');
    m = next(swung(m, missOf('a')));
    expect(m.lastKind).toBe('knuckleball');
    expect(pitched(dealt(m, hand), knuckle).pitch).toBeNull();
    expect(pitched(dealt(m, hand), fast).pitch).toEqual(fast);
  });

  it('a new batter clears the kind, so anything goes on the first pitch', () => {
    let m = pitched(dealt(start(), hand), knuckle);
    m = next(swung(m, hitOf('kane', 1)));
    expect(m.lastKind).toBeNull();
  });
});

describe('the count', () => {
  it('a miss is a strike, three strikes are an out, and the batter is not burnt', () => {
    let m = start();
    m = swing(m, missOf('vardy'));
    expect(m.strikes).toBe(1);
    expect(m.call).toBeNull();
    m = swing(m, missOf('vardy'));
    m = swung(pitched(dealt(m, hand), legal(m)), missOf('vardy'));
    expect(m.call).toMatchObject({ kind: 'strike', out: true, sideRetired: false });
    m = next(m);
    expect(m.outs).toBe(1);
    expect(m.strikes).toBe(0);
    expect(m.strikeouts).toEqual([1, 0]);
    expect(m.used).toEqual([]);
  });

  it('the clock and "nothing" are strikes too', () => {
    let m = pitched(dealt(start(), hand), fast);
    m = strike(m, 'clock');
    expect(m.call).toMatchObject({ kind: 'strike', reason: 'clock', out: false });
    expect(m.strikes).toBe(1);
    expect(m.pitch).toBeNull();
  });

  it('a name already hit is a foul: a strike, unless the count is two', () => {
    let m = start();
    m = swing(m, hitOf('kane', 1));
    expect(m.used).toEqual(['kane']);
    // Next batter (same side, one-man lineup), Kane again.
    m = swung(pitched(dealt(m, hand), legal(m)), hitOf('kane', 1));
    expect(m.call).toMatchObject({ kind: 'foul', counted: true });
    expect(m.strikes).toBe(1);
    m = next(m);
    m = swing(m, missOf('x'));
    expect(m.strikes).toBe(2);
    m = swung(pitched(dealt(m, hand), legal(m)), hitOf('kane', 4));
    expect(m.call).toMatchObject({ kind: 'foul', counted: false });
    expect(m.strikes).toBe(2);
    expect(m.outs).toBe(0);
    expect(total(m, 0)).toBe(0);
    expect(phase(next(m))).toBe('deal');
  });
});

describe('the bases', () => {
  it('a single puts the batter on first and moves everyone one', () => {
    let m = start();
    m = swing(m, hitOf('a', 1));
    expect(m.bases.map((r) => r?.id)).toEqual(['a', undefined, undefined]);
    m = swing(m, hitOf('b', 1));
    expect(m.bases.map((r) => r?.id)).toEqual(['b', 'a', undefined]);
    m = swing(m, hitOf('c', 2));
    expect(m.bases.map((r) => r?.id)).toEqual([undefined, 'c', 'b']);
    expect(total(m, 0)).toBe(1);
    expect(m.hits).toEqual([3, 0]);
  });

  it('a grand slam clears the bases for four', () => {
    let m = start();
    m = swing(m, hitOf('a', 1));
    m = swing(m, hitOf('b', 1));
    m = swing(m, hitOf('c', 1));
    m = swung(pitched(dealt(m, hand), legal(m)), hitOf('d', 4));
    expect(m.call).toMatchObject({ kind: 'hit', bases: 4, runs: 4, grandSlam: true });
    expect(m.bases).toEqual([null, null, null]);
    expect(total(m, 0)).toBe(4);
  });

  it('three outs strand the runners and change sides', () => {
    let m = start();
    m = swing(m, hitOf('a', 3));
    m = out(m);
    m = out(m);
    expect(m.outs).toBe(2);
    m = whiff(whiff(m));
    m = swung(pitched(dealt(m, hand), legal(m)), missOf('z'));
    expect(m.call).toMatchObject({ kind: 'strike', out: true, sideRetired: true });
    m = next(m);
    expect(m.half).toBe('bottom');
    expect(m.outs).toBe(0);
    expect(m.bases).toEqual([null, null, null]);
    expect(batter(m)).toEqual({ side: 1, name: 'Dave' });
  });

  it('a lineup bats in order and carries over between innings', () => {
    let m = start();
    m = out(out(out(m)));
    expect(batter(m).name).toBe('Dave');
    m = out(m);
    expect(batter(m).name).toBe('Sam');
    m = out(m);
    expect(batter(m).name).toBe('Dave');
    m = out(m);
    expect(m.inning).toBe(2);
    expect(m.half).toBe('top');
    // Bottom of the second: Sam is due, not Dave.
    m = out(out(out(m)));
    expect(batter(m).name).toBe('Sam');
  });
});

describe('the end', () => {
  const halfOf = (m: Match, runs: number): Match => {
    for (let i = 0; i < runs; i++) m = swing(m, hitOf(`hr${k}`, 4));
    return out(out(out(m)));
  };

  it('the home side does not bat the bottom of the last if it leads', () => {
    let m = start(1);
    m = halfOf(m, 0); // top 1: away 0
    m = halfOf(m, 2); // bottom 1: home 2 -> but with 1 inning this is a walk-off on the first run
    expect(m.status).toBe('over');
    expect(m.winner).toBe(1);
  });

  it('a walk-off ends it the moment the home side leads in the last', () => {
    let m = start(1);
    m = halfOf(m, 1);
    expect(m.half).toBe('bottom');
    m = swung(pitched(dealt(m, hand), legal(m)), hitOf('tie', 4));
    expect(m.status).toBe('live');
    m = next(m);
    m = swung(pitched(dealt(m, hand), legal(m)), hitOf('win', 4));
    expect(m.call).toMatchObject({ kind: 'hit', walkOff: true });
    m = next(m);
    expect(phase(m)).toBe('over');
    expect(m.winner).toBe(1);
  });

  it('the home side skips its last half when already ahead', () => {
    let m = start(2);
    m = halfOf(m, 0);
    m = halfOf(m, 3);
    expect(m.inning).toBe(2);
    m = halfOf(m, 1);
    expect(m.status).toBe('over');
    expect(m.winner).toBe(1);
    expect(total(m, 1)).toBe(3);
  });

  it('tied after the last: extra innings until someone leads', () => {
    let m = start(1);
    m = halfOf(m, 1);
    m = halfOf(m, 1);
    expect(m.status).toBe('live');
    expect(m.inning).toBe(2);
    expect(m.runs[0]).toHaveLength(2);
    m = halfOf(m, 2);
    m = halfOf(m, 0);
    expect(m.status).toBe('over');
    expect(m.winner).toBe(0);
  });

  it('a rematch swaps home and away', () => {
    const m = rematch(start());
    expect(m.sides[0].name).toBe('Home');
    expect(m.sides[1].name).toBe('Away');
    expect(m.status).toBe('live');
  });
});
