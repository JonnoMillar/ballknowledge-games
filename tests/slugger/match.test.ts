import { describe, it, expect } from 'vitest';
import {
  batter, canThrow, dealt, newMatch, next, out, phase, pitched, rematch, swung, total,
  type Match, type Pitch, type Verdict,
} from '../../src/lib/slugger/match';

const club = (id: string) => ({ id, name: id, crest: false });
const fast: Pitch = { ...club('BARCA'), kind: 'fastball' };
const curve: Pitch = { ...club('LEICESTER'), kind: 'curveball' };
const slider: Pitch = { ...club('STOKE'), kind: 'slider' };
const knuckle: Pitch = { ...club('BOLTON'), kind: 'knuckleball' };
const hand = [fast, curve, slider, knuckle];

const hitOf = (id: string): Verdict => ({ verdict: 'hit', player: { id, name: id }, apps: 10, club: club('X') });
const missOf = (id: string): Verdict => ({ verdict: 'miss', player: { id, name: id }, clubs: [club('Y')] });

const start = (innings = 3) =>
  newMatch({ innings, clock: 30 }, [{ name: 'Away', lineup: ['Jonno'] }, { name: 'Home', lineup: ['Dave', 'Sam'] }]);

let n = 0;
/** Throw `p`, and the batter hits it. */
const hits = (m: Match, p: Pitch): Match => next(swung(pitched(dealt(m, hand), p), hitOf(`h${n++}`)));
/** Throw `p`, and the batter misses. */
const whiff = (m: Match, p: Pitch = curve): Match => next(swung(pitched(dealt(m, hand), p), missOf(`m${n++}`)));
/** Three outs: a half. */
const halfOut = (m: Match): Match => whiff(whiff(whiff(m)));

describe('the shape of a match', () => {
  it('starts top of the first with the away side due up', () => {
    const m = start();
    expect(phase(m)).toBe('deal');
    expect(m.inning).toBe(1);
    expect(m.half).toBe('top');
    expect(batter(m)).toEqual({ side: 0, name: 'Jonno' });
    expect(m.runs).toEqual([[0, 0, 0], [0, 0, 0]]);
    expect(m.knuckleballs).toEqual([3, 3]);
  });

  it('a side with no lineup bats under its own name', () => {
    const m = newMatch({ innings: 3, clock: 0 }, [{ name: 'Us', lineup: [] }, { name: 'Them', lineup: ['  '] }]);
    expect(m.sides[0].lineup).toEqual(['Us']);
    expect(m.sides[1].lineup).toEqual(['Them']);
  });

  it('a knuckleball is spent from the fielding side, and three is the lot', () => {
    let m = start();
    expect(canThrow(m, 'knuckleball')).toBe(true);
    m = hits(m, knuckle);
    expect(m.knuckleballs).toEqual([3, 2]);
    m = hits(m, knuckle);
    m = hits(m, knuckle);
    expect(m.knuckleballs).toEqual([3, 0]);
    // Home now bats; away pitches, with all three still in hand.
    expect(m.half).toBe('bottom');
    expect(canThrow(m, 'knuckleball')).toBe(true);
    m = halfOut(m);
    expect(canThrow(m, 'knuckleball')).toBe(false);
    expect(pitched(dealt(m, hand), knuckle).pitch).toBeNull();
    expect(canThrow(m, 'fastball')).toBe(true);
  });
});

describe('a swing', () => {
  it('a miss is an out, and the name is not burnt', () => {
    let m = pitched(dealt(start(), hand), curve);
    m = swung(m, missOf('vardy'));
    expect(m.call).toMatchObject({ kind: 'out', reason: 'miss', sideRetired: false });
    m = next(m);
    expect(m.up).toBe(1);
    expect(m.outs).toEqual([1, 0]);
    expect(m.used).toEqual([]);
    expect(phase(m)).toBe('deal');
  });

  it('the clock and "nothing" are outs too', () => {
    let m = pitched(dealt(start(), hand), fast);
    m = out(m, 'clock');
    expect(m.call).toMatchObject({ kind: 'out', reason: 'clock', club: { id: 'BARCA' } });
    expect(m.pitch).toBeNull();
  });

  it('a name already hit is a foul: swing again at the same pitch', () => {
    let m = start();
    m = hits(m, fast);
    const kane = m.used[0]!;
    m = pitched(dealt(m, hand), curve);
    m = swung(m, hitOf(kane));
    expect(m.foul?.id).toBe(kane);
    expect(m.call).toBeNull();
    expect(m.pitch).toEqual(curve);
    expect(m.up).toBe(1);
    m = swung(m, hitOf('other'));
    expect(m.call).toMatchObject({ kind: 'hit', bases: 2 });
    expect(next(m).foul).toBeNull();
  });
});

describe('the bases', () => {
  it('a hit is worth the pitch', () => {
    let m = start();
    m = swung(pitched(dealt(m, hand), fast), hitOf('a'));
    expect(m.call).toMatchObject({ kind: 'hit', bases: 1 });
    expect(m.bases.map((r) => r?.id)).toEqual(['a', undefined, undefined]);
    m = swung(pitched(dealt(next(m), hand), slider), hitOf('b'));
    expect(m.call).toMatchObject({ kind: 'hit', bases: 3, runs: 1 });
    expect(m.bases.map((r) => r?.id)).toEqual([undefined, undefined, 'b']);
  });

  it('three fastball singles score exactly one run: second comes home on any hit', () => {
    let m = start();
    m = hits(m, fast);
    const first = m.bases[0]!.id;
    m = hits(m, fast);
    expect(m.bases.map((r) => r?.id)).toEqual([expect.any(String), first, undefined]);
    m = swung(pitched(dealt(m, hand), fast), hitOf('c'));
    expect(m.call).toMatchObject({ kind: 'hit', bases: 1, runs: 1, sideRetired: true });
    expect(total(m, 0)).toBe(1);
    expect(m.hits).toEqual([3, 0]);
  });

  it('a grand slam clears the bases for four', () => {
    let m = start();
    // Two on, then a knuckleball with a runner on third and second needs a
    // third batter: use a one-inning game where the half is three long.
    m = hits(m, fast);
    m = hits(m, fast);
    m = swung(pitched(dealt(m, hand), knuckle), hitOf('d'));
    // Runner on second scored on the way; not a grand slam with two on.
    expect(m.call).toMatchObject({ kind: 'hit', bases: 4, runs: 3, grandSlam: false });
    expect(m.bases).toEqual([null, null, null]);
  });

  it('a double sends the runner on first to third', () => {
    let m = start();
    m = hits(m, fast);
    const first = m.bases[0]!.id;
    m = hits(m, curve);
    expect(m.bases.map((r) => r?.id)).toEqual([undefined, expect.any(String), first]);
  });

  it('three batters strand the runners and change sides', () => {
    let m = start();
    m = hits(m, curve);
    m = whiff(m);
    m = swung(pitched(dealt(m, hand), curve), missOf('z'));
    expect(m.call).toMatchObject({ kind: 'out', sideRetired: true });
    m = next(m);
    expect(m.half).toBe('bottom');
    expect(m.up).toBe(0);
    expect(m.bases).toEqual([null, null, null]);
    expect(batter(m)).toEqual({ side: 1, name: 'Dave' });
  });

  it('a lineup bats in order and carries over between innings', () => {
    let m = start();
    m = halfOut(m);
    expect(batter(m).name).toBe('Dave');
    m = whiff(m);
    expect(batter(m).name).toBe('Sam');
    m = whiff(m);
    expect(batter(m).name).toBe('Dave');
    m = whiff(m);
    expect(m.inning).toBe(2);
    expect(m.half).toBe('top');
    m = halfOut(m);
    expect(batter(m).name).toBe('Sam');
  });
});

describe('the end', () => {
  const halfOf = (m: Match, runs: number): Match => {
    // Each knuckleball-less way to a run: a slider then a single, or a homer.
    for (let i = 0; i < runs; i++) m = hits(m, knuckle);
    for (let i = runs; i < 3; i++) m = whiff(m);
    return m;
  };
  // Enough knuckleballs for the test: give both sides plenty.
  const homers = (innings: number): Match => ({ ...start(innings), knuckleballs: [99, 99] });

  it('the home side does not bat the bottom of the last if it leads', () => {
    let m = homers(2);
    m = halfOf(m, 0);
    m = halfOf(m, 2);
    expect(m.inning).toBe(2);
    m = halfOf(m, 1);
    expect(m.status).toBe('over');
    expect(m.winner).toBe(1);
    expect(total(m, 1)).toBe(2);
  });

  it('a walk-off ends it the moment the home side leads in the last', () => {
    let m = homers(1);
    m = halfOf(m, 1);
    expect(m.half).toBe('bottom');
    m = swung(pitched(dealt(m, hand), knuckle), hitOf('tie'));
    expect(m.status).toBe('live');
    m = next(m);
    m = swung(pitched(dealt(m, hand), knuckle), hitOf('win'));
    expect(m.call).toMatchObject({ kind: 'hit', walkOff: true });
    m = next(m);
    expect(phase(m)).toBe('over');
    expect(m.winner).toBe(1);
  });

  it('tied after the last: extra innings until someone leads', () => {
    let m = homers(1);
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
    expect(m.knuckleballs).toEqual([3, 3]);
  });
});
