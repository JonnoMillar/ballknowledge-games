import { describe, expect, it } from 'vitest';
import { againstPar, par, points, ring, shareText, tally } from '../lib/score';

describe('rings', () => {
  it('has a 2 m bullseye, then 5 and 10', () => {
    expect(ring(2)).toBe('bullseye');
    expect(ring(2.01)).toBe('inner');
    expect(ring(5)).toBe('inner');
    expect(ring(5.01)).toBe('outer');
    expect(ring(10)).toBe('outer');
    expect(ring(10.01)).toBe('miss');
  });
});

describe('points', () => {
  it('gives 100 inside the bullseye and decays after', () => {
    expect(points(0)).toBe(100);
    expect(points(2)).toBe(100);
    expect(points(3)).toBe(88);
    expect(points(5)).toBe(69);
    expect(points(10)).toBe(37);
    expect(points(20)).toBe(11);
  });
});

describe('tally and par', () => {
  it('adds metres to a decimal and points to a whole', () => {
    expect(tally([1, 3, 4, 12, 6, 5.4])).toEqual({ metres: 31.4, points: 421 });
  });
  it('makes par the lazy pin: every goal pinned on the penalty spot', () => {
    const t = par([{ x: 34, y: 11 }, { x: 34, y: 14 }, { x: 38, y: 14 }]);
    expect(t.metres).toBe(8);
    expect(t.points).toBe(100 + 88 + 69);
  });
  it('words a score against par', () => {
    expect(againstPar(31.4, 57.4)).toBe('26 under');
    expect(againstPar(12, 10)).toBe('2 over');
    expect(againstPar(10, 10.4)).toBe('level');
  });
});

describe('the share text', () => {
  const ds = [1, 3, 4, 12, 6, 5.4];
  const p = { metres: 57.4, points: 263 };
  it('names nothing, in metres', () => {
    expect(shareText('No. 3', ds, p, 'metres')).toBe('Pitch pin No. 3\n31.4 m, par 57 (26 under)\n🎯🟩🟩⬜🟨🟨');
  });
  it('names nothing, in points', () => {
    expect(shareText('No. 3', ds, p, 'points')).toBe('Pitch pin No. 3\n421 / 600, par 263\n🎯🟩🟩⬜🟨🟨');
  });
});
