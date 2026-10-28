import { describe, expect, it } from 'vitest';
import { SHOW, showAt } from '../lib/show';
import { GRADES } from '../../../src/lib/chain/grade';

describe('the reveal show', () => {
  it('starts and ends at rest, so a skip or the last frame lands where the card sits', () => {
    for (const g of GRADES) {
      for (const u of [0, 1]) {
        const f = showAt(SHOW[g], u);
        expect(f.push).toBeCloseTo(1, 6);
        expect(f.rx).toBeCloseTo(0, 6);
        expect(f.ry).toBeCloseTo(0, 6);
        expect(f.lit).toBeCloseTo(0, 6);
        expect(f.pool).toBeCloseTo(0, 6);
      }
    }
  });

  it('pushes in to the grade’s depth while held, deeper grades further', () => {
    const peak = GRADES.map((g) => showAt(SHOW[g], 0.5).push);
    peak.forEach((p, i) => expect(p).toBeCloseTo(SHOW[GRADES[i]!].push, 6));
    for (let i = 1; i < peak.length; i++) expect(peak[i]).toBeGreaterThanOrEqual(peak[i - 1]!);
  });

  it('never pushes past its peak, and Basic never pushes or sways', () => {
    for (const g of GRADES) {
      for (let u = 0; u <= 1; u += 0.01) expect(showAt(SHOW[g], u).push).toBeLessThanOrEqual(SHOW[g].push + 1e-9);
    }
    for (let u = 0; u <= 1; u += 0.05) {
      const f = showAt(SHOW.basic, u);
      expect(f.push).toBe(1);
      expect(Math.abs(f.ry)).toBe(0);
    }
  });

  it('keeps the new part of the reveal at 1.2s or under', () => {
    for (const g of GRADES) expect(SHOW[g].ms).toBeLessThanOrEqual(1200);
  });
});
