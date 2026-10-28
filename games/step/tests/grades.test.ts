import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Ruler, Views } from '../lib/rules';
import { scoreVerdicts } from '../../../scripts/step/verdicts';
import type { Player } from '../../../src/lib/chemistry/types';

/**
 * Jonno's verdicts on real picks, three feedback rounds (2026-10-20/21),
 * against the shipped ruler on the real pool. When tuned (2026-10-21) the
 * game hit 47 of 59, 12 grades off in all, none more than one; before the era fade and club
 * reach, 30 of 59 and 30 off. A pool or ruler change that loses ground on
 * his verdicts fails here: `npx tsx scripts/step/verdicts.ts` lists them.
 */
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
const views = JSON.parse(readFileSync('data/player-views.json', 'utf8')) as Views;
const ruler = JSON.parse(readFileSync('games/step/data/ruler.json', 'utf8')) as Ruler;

describe("Jonno's verdicts", () => {
  const rows = scoreVerdicts(pool, views, ruler);

  it('the game grades most of them as he did', () => {
    expect(rows.length).toBeGreaterThanOrEqual(55);
    expect(rows.filter((r) => r.off === 0).length).toBeGreaterThanOrEqual(45);
    expect(rows.reduce((n, r) => n + r.off, 0)).toBeLessThanOrEqual(14);
  });

  it('none is more than one grade off', () => {
    expect(rows.filter((r) => r.off > 1).map((r) => `${r.title}: ${r.grade}`)).toEqual([]);
  });
});
