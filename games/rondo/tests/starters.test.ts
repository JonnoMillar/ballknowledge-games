import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { audienceKnows } from '../server';
import type { Player } from '../../../src/lib/chemistry/types';

/** Jonno's keep/cut round on the real pool (2026-10-21), as of that year. */
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
const views = JSON.parse(readFileSync('data/player-views.json', 'utf8')) as Record<string, number>;
const knows = (name: string) => audienceKnows(pool.find((p) => p.name === name)!, views, 2026);

describe('Rondo starters the audience knows', () => {
  it('keeps recent names and the icons', () => {
    for (const n of ['Mohamed Salah', 'Pedro', 'Chris Smalling', 'David Beckham', 'Thierry Henry']) expect(knows(n), n).toBe(true);
  });

  it('cuts the obscure, the old, and retired players with an undated spell', () => {
    for (const n of ['Asamoah Gyan', 'Tomáš Rosický', 'Per Mertesacker', 'Gary Cahill', 'Patrick Vieira', 'Rio Ferdinand', 'Zinedine Zidane', 'Romário', 'Michael Laudrup']) expect(knows(n), n).toBe(false);
  });
});
