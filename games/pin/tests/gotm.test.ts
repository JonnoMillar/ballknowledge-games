import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gotmUrl, monthsDue, parseShortlist } from '../lib/gotm';

const page = (name: string) => readFileSync(`games/pin/tests/fixtures/${name}`, 'utf8');

describe('parseShortlist', () => {
  it('reads September 2026: eight nominees in page order', () => {
    const picks = parseShortlist(page('gotm-2026-09.html'), '2026-09');
    expect(picks.map((p) => p.player)).toEqual([
      'Harvey Barnes', 'Bryan Mbeumo', 'Ainsley Maitland-Niles', 'Bruno Guimaraes',
      'Lewis Dunk', 'Nicolas Jackson', 'Emiliano Buendia', 'Jay Dasilva',
    ]);
    expect(picks[4]).toEqual({ player: 'Lewis Dunk', clubs: ['coventry city', 'brighton and hove albion'], when: '2026-09' });
  });
  it('reads August 2025, which is marked up differently', () => {
    const picks = parseShortlist(page('gotm-2025-08.html'), '2025-08');
    expect(picks).toHaveLength(8);
    expect(picks[0]).toEqual({ player: 'Antoine Semenyo', clubs: ['liverpool', 'bournemouth'], when: '2025-08' });
    expect(picks[1]!.player).toBe('Richarlison');
    expect(picks[7]).toEqual({ player: 'Marc Guehi', clubs: ['aston villa', 'crystal palace'], when: '2025-08' });
  });
  it('reads nothing from a page with no shortlist', () => {
    expect(parseShortlist('<p>Coming soon</p>', '2026-10')).toEqual([]);
  });
});

describe('gotmUrl', () => {
  it('puts the month in its season', () => {
    expect(gotmUrl('2026-09')).toBe('https://www.premierleague.com/en/awards/goal-of-the-month/2026-27/september');
    expect(gotmUrl('2027-01')).toBe('https://www.premierleague.com/en/awards/goal-of-the-month/2026-27/january');
  });
});

describe('monthsDue', () => {
  it('tries last month, and the one before while its pack is missing', () => {
    expect(monthsDue('2026-10-09', () => false)).toEqual(['2026-09', '2026-08']);
    expect(monthsDue('2026-10-09', (m) => m === '2026-08')).toEqual(['2026-09']);
    expect(monthsDue('2026-10-09', () => true)).toEqual([]);
    expect(monthsDue('2027-01-03', () => false)).toEqual(['2026-12', '2026-11']);
  });
});
