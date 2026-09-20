import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { DECK, MIN_KNOWN, PITCH_KINDS } from '../../src/lib/slugger/deck';
import { DOUBLE_AT, stintFame } from '../../src/lib/slugger/grade';
import type { ClubRecord } from '../../src/lib/clubs';
import type { Player } from '../../src/lib/chemistry/types';

const hasData = existsSync('data/pool.json') && existsSync('data/clubs.json');
const players: Player[] = hasData ? (JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[]) : [];
const clubs: Record<string, ClubRecord> = hasData
  ? (JSON.parse(readFileSync('data/clubs.json', 'utf8')) as Record<string, ClubRecord>)
  : {};

const all = PITCH_KINDS.flatMap((k) => DECK[k]);

describe('the deck', () => {
  it('has three piles with no club in two of them', () => {
    expect(new Set(all).size).toBe(all.length);
    for (const k of PITCH_KINDS) expect(DECK[k].length).toBeGreaterThanOrEqual(30);
  });

  it('is enough for a five-inning game without a repeat', () => {
    // Five innings, both sides, up to three outs of three strikes each, one
    // pitch a swing: 90 pitches at most, a third from each pile.
    for (const k of PITCH_KINDS) expect(DECK[k].length).toBeGreaterThanOrEqual(30);
  });
});

describe.skipIf(!hasData)('the deck against the pool', () => {
  const byClub = new Map<string, Player[]>();
  for (const p of players) for (const c of p.clubIds) byClub.set(c, [...(byClub.get(c) ?? []), p]);
  const known = (id: string) => (byClub.get(id) ?? []).filter((p) => stintFame(p, id) >= 40).length;

  it('every club exists, has a crest, and has a shelf of names', () => {
    for (const id of all) {
      const rec = clubs[id];
      expect(rec, id).toBeDefined();
      expect(rec!.crest || rec!.crestUrl, `${id} ${rec!.name}`).toBeTruthy();
      expect(known(id), `${id} ${rec!.name}`).toBeGreaterThanOrEqual(MIN_KNOWN);
    }
  });

  it('the piles are in order: fastballs are the deepest, knuckleballs the shallowest', () => {
    const min = (k: keyof typeof DECK) => Math.min(...DECK[k].map(known));
    const max = (k: keyof typeof DECK) => Math.max(...DECK[k].map(known));
    expect(min('fastball')).toBeGreaterThan(max('knuckleball'));
    expect(min('curveball')).toBeGreaterThan(max('knuckleball'));
    expect(max('curveball')).toBeLessThan(min('fastball') + 5);
  });

  it('every fastball has a shelf of singles, so it is hittable by anyone', () => {
    for (const id of DECK.fastball) {
      const singles = (byClub.get(id) ?? []).filter((p) => stintFame(p, id) >= DOUBLE_AT).length;
      expect(singles, clubs[id]!.name).toBeGreaterThanOrEqual(20);
    }
  });
});
