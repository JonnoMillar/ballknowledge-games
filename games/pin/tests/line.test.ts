import { describe, expect, it } from 'vitest';
import { ACTIONS, leaks, ordinal, recentLine } from '../lib/line';

describe('leaks', () => {
  it('catches words that give the position away', () => {
    expect(leaks('A long-range strike')).toEqual(['long', 'range']);
    expect(leaks('With the left foot')).toEqual(['left']);
    expect(leaks('From the edge of the box')).toEqual(['edge', 'box']);
  });
  it('catches gendered words', () => {
    expect(leaks('His first goal')).toEqual(['his']);
  });
  it('lets a clean line through', () => {
    expect(leaks('An overhead kick in the fifth minute of stoppage time.')).toEqual([]);
    expect(leaks("A speculative strike that squirmed through Karius's hands.")).toEqual([]);
  });
});

describe('ordinal', () => {
  it('says 1st, 2nd, 3rd, 11th, 21st', () => {
    const cases: [number, string][] = [[1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'], [13, '13th'], [21, '21st'], [22, '22nd'], [23, '23rd'], [101, '101st']];
    for (const [n, s] of cases) expect(ordinal(n)).toBe(s);
  });
});

describe('the line for a recent goal', () => {
  it('says the finish, how it came, the minute and the score', () => {
    expect(recentLine({ shotType: 'RightFoot', situation: 'OpenPlay', lastAction: 'TakeOn', minute: 56, score: [4, 3] }))
      .toBe('A shot after a dribble, in the 56th minute, to make it 4–3.');
    expect(recentLine({ shotType: 'Head', situation: 'FromCorner', lastAction: 'Cross', minute: 42, score: [3, 1] }))
      .toBe('A header from a corner, in the 42nd minute, to make it 3–1.');
  });
  it('drops the score when it cannot be trusted', () => {
    expect(recentLine({ shotType: 'RightFoot', situation: 'DirectFreekick', lastAction: 'Standard', minute: 8, score: null }))
      .toBe('A direct free kick, in the 8th minute.');
  });
  it('never says minute 0', () => {
    expect(recentLine({ shotType: 'LeftFoot', situation: 'OpenPlay', lastAction: 'Pass', minute: 0, score: [1, 0] }))
      .toBe('A shot, in the 1st minute, to make it 1–0.');
  });
  it('never leaks a position, whatever the data says', () => {
    for (const shotType of ['RightFoot', 'LeftFoot', 'Head', 'OtherBodyPart'])
      for (const situation of ['OpenPlay', 'FromCorner', 'SetPiece', 'DirectFreekick'])
        for (const lastAction of [...Object.keys(ACTIONS), 'Standard', 'Pass', 'None'])
          expect(leaks(recentLine({ shotType, situation, lastAction, minute: 30, score: [1, 1] }))).toEqual([]);
  });
});
