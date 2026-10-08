import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import goalsJson from '../data/goals.json';
import packsJson from '../data/packs.json';
import daysJson from '../data/days.json';
import { dailyPool, fair, isDate } from '../lib/boards';
import { leaks } from '../lib/line';
import { inHalf } from '../lib/pitch';
import type { Goals, Pack } from '../lib/types';

const goals = goalsJson as unknown as Goals;
const packs = packsJson as unknown as Pack[];
const days = daysJson as unknown as Record<string, string[]>;

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
});

describe('packs', () => {
  it('are six distinct classics each, fair, and share no goal', () => {
    const seen = new Set<string>();
    for (const p of packs) {
      expect(new Set(p.goals).size, p.id).toBe(6);
      for (const s of p.goals) {
        expect(goals[s]?.kind, `${p.id}: ${s}`).toBe('classic');
        expect(seen.has(s), s).toBe(false);
        seen.add(s);
      }
      expect(fair(p.goals.map((s) => goals[s]!.at)), p.id).toBe(true);
    }
  });
});

describe('daily boards', () => {
  it('leaves enough classics for the daily', () => {
    expect(dailyPool(goals, packs).length).toBeGreaterThanOrEqual(12);
  });
  for (const [date, slugs] of Object.entries(days)) {
    it(date, () => {
      expect(isDate(date)).toBe(true);
      expect(new Set(slugs).size).toBe(6);
      for (const s of slugs) expect(goals[s], s).toBeDefined();
      expect(slugs.filter((s) => goals[s]!.kind === 'recent')).toHaveLength(4);
      expect(fair(slugs.map((s) => goals[s]!.at))).toBe(true);
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
