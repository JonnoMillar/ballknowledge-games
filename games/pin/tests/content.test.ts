import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import goalsJson from '../data/goals.json';
import { isDate } from '../lib/dates';
import { leaks } from '../lib/line';
import { inHalf } from '../lib/pitch';
import { fair } from '../lib/round';
import { PACK_KINDS, type Goals, type Pack } from '../lib/types';

const goals = goalsJson as unknown as Goals;
const DIR = 'games/pin/data/packs';
const packs = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Pack] as const);
const SEASONAL = new Set(['round', 'month', 'season']);

describe('every goal', () => {
  for (const [slug, g] of Object.entries(goals)) {
    it(slug, () => {
      expect(g.scorer && g.match && g.competition && g.line).toBeTruthy();
      expect(isDate(g.date)).toBe(true);
      expect(inHalf(g.at)).toBe(true);
      expect(g.xg).toBeGreaterThanOrEqual(0);
      expect(g.xg).toBeLessThanOrEqual(1);
      expect(leaks(g.line)).toEqual([]);
      expect(g.source.from).toBe(g.kind === 'classic' ? 'statsbomb' : 'understat');
    });
  }
  it('is in at least one pack', () => {
    const used = new Set(packs.flatMap(([, p]) => p.goals));
    expect(Object.keys(goals).filter((s) => !used.has(s))).toEqual([]);
  });
});

describe('every pack', () => {
  it('there are at least the seven classic packs', () => {
    expect(packs.length).toBeGreaterThanOrEqual(7);
  });
  for (const [file, p] of packs) {
    it(file, () => {
      expect(p.id).toBe(file.replace(/\.json$/, ''));
      expect(p.id).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(PACK_KINDS).toContain(p.kind);
      expect(p.title && p.subtitle).toBeTruthy();
      expect(isDate(p.published)).toBe(true);
      if (SEASONAL.has(p.kind)) expect(p.season).toMatch(/^\d{4}-\d{2}$/);
      else expect(p.season).toBeUndefined();
      expect(p.goals.length).toBeGreaterThanOrEqual(6);
      expect(p.goals.length).toBeLessThanOrEqual(9);
      expect(new Set(p.goals).size).toBe(p.goals.length);
      for (const s of p.goals) expect(goals[s], s).toBeDefined();
      if (p.kind === 'round' || p.kind === 'classic') expect(fair(p.goals.map((s) => goals[s]!.at))).toBe(true);
    });
  }
});

describe('the copy', () => {
  it('is gender-neutral in every component', () => {
    for (const f of readdirSync('games/pin/components').filter((f) => f.endsWith('.tsx'))) {
      const text = readFileSync(`games/pin/components/${f}`, 'utf8');
      expect(text.match(/\b(he|his|him)\b/gi), f).toBeNull();
    }
  });
});
