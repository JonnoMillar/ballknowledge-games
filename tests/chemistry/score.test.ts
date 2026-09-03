import { describe, it, expect } from 'vitest';
import {
  playerChemistry,
  squadChemistry,
  CHEMISTRY_GATE,
  MAX_SQUAD_CHEMISTRY,
} from '../../src/lib/chemistry/score';

describe('playerChemistry', () => {
  it('gives 10 when every link is green', () => {
    expect(playerChemistry(4, 8)).toBe(10);
  });

  it('gives 0 when every link is red', () => {
    expect(playerChemistry(4, 0)).toBe(0);
  });

  it('gives 5 when every link is orange', () => {
    expect(playerChemistry(4, 4)).toBe(5);
  });

  it('counts unresolved links as zero, so partial boards score low', () => {
    // 4 links, only 2 resolved and both green = 4 points of a possible 8.
    expect(playerChemistry(4, 4)).toBe(5);
  });

  it('never exceeds 10 or drops below 0', () => {
    expect(playerChemistry(2, 99)).toBe(10);
    expect(playerChemistry(2, -5)).toBe(0);
  });

  it('returns 0 for an isolated slot rather than dividing by zero', () => {
    expect(playerChemistry(0, 0)).toBe(0);
  });
});

describe('squadChemistry', () => {
  it('sums the eleven players', () => {
    expect(squadChemistry([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10])).toBe(110);
  });

  it('is not capped at the gate, so a better solve shows a higher number', () => {
    const perfect = squadChemistry(Array(11).fill(10));
    expect(perfect).toBe(MAX_SQUAD_CHEMISTRY);
    expect(perfect).toBeGreaterThan(CHEMISTRY_GATE);
  });

  it('leaves ten points of slack above the gate', () => {
    expect(MAX_SQUAD_CHEMISTRY - CHEMISTRY_GATE).toBe(10);
  });
});
