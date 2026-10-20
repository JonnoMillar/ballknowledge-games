import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { judge, type Views } from '../lib/rules';
import { GRADES, type Grade } from '../../../src/lib/chain/grade';
import type { Player } from '../../../src/lib/chemistry/types';

/**
 * The worst grades found on real steps on 2026-10-19 (games/step/HANDOFF.md),
 * pinned on the real pool: picks any British fan can judge without a ruler.
 * Under the old ruler (sitelinks, the given's short spells counting against
 * the link) every one of these was off by two grades or more.
 */
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
const views = JSON.parse(readFileSync('data/player-views.json', 'utf8')) as Views;
const clubs = JSON.parse(readFileSync('data/clubs.json', 'utf8')) as Record<string, { name: string }>;
const byName = new Map(pool.map((p) => [p.name, p]));
const clubId = new Map(Object.entries(clubs).map(([id, c]) => [c.name, id]));

const PINS: [given: string, club: string, pick: string, lowest: Grade, highest: Grade, why: string][] = [
  ['Thierry Henry', 'ACF Fiorentina', 'Roberto Baggio', 'basic', 'basic', 'was Decent: Henry\'s one season at Juventus buried every Juventus link'],
  ['Thierry Henry', 'ACF Fiorentina', 'Federico Chiesa', 'basic', 'decent', 'was Solid, same cause'],
  ['Thierry Henry', 'ACF Fiorentina', 'Dušan Vlahović', 'basic', 'decent', 'was Solid, same cause'],
  ['Thierry Henry', 'ACF Fiorentina', 'Ramón Díaz', 'solid', 'elite', 'was Basic: linked through Monaco, where Henry was long'],
  ['Arjen Robben', 'AS Roma', 'Mohamed Salah', 'basic', 'decent', 'was Sharp: his short Chelsea spell outweighed being Salah'],
  ['Raheem Sterling', 'Tottenham Hotspur F.C.', 'Robbie Keane', 'basic', 'solid', 'was Sharp, same cause (half a season at Liverpool)'],
  ['Neymar', 'Chelsea F.C.', "Samuel Eto'o", 'basic', 'solid', 'was Sharp, same cause'],
  ['Ashley Cole', 'Nottingham Forest F.C.', 'Ian Wright', 'decent', 'elite', 'a ten-game loan: raw views alone made it Basic (Decent or Solid is in the feedback round)'],
  ['Lamine Yamal', 'RCD Espanyol de Barcelona', "Samuel Eto'o", 'solid', 'elite', 'a loan in 1997: tempering the stint made it Basic'],
  ['Neymar', 'AS Roma', 'Pep Guardiola', 'decent', 'elite', 'four games in 2003: tempering made it Basic'],
];

describe('grades on real steps', () => {
  for (const [g, c, p, lo, hi, why] of PINS) {
    it(`${p} (${g} · ${c}) is ${lo === hi ? lo : `${lo} to ${hi}`}: ${why}`, () => {
      const given = byName.get(g)!, pick = byName.get(p)!, club = clubId.get(c)!;
      const members = pool.filter((x) => x.clubIds.includes(club));
      const { held, grade } = judge(pick, given, club, members, views);
      expect(held).toBe(true);
      const at = GRADES.indexOf(grade!);
      expect(at, grade!).toBeGreaterThanOrEqual(GRADES.indexOf(lo));
      expect(at, grade!).toBeLessThanOrEqual(GRADES.indexOf(hi));
    });
  }
});
