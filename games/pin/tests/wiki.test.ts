import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isoDate, parseWinners } from '../lib/wiki';

const winners = parseWinners(readFileSync('games/pin/tests/fixtures/gotm-wikipedia.txt', 'utf8'));

describe('parseWinners', () => {
  it('reads all 91 winners, nine a season but 2022/23', () => {
    expect(winners).toHaveLength(91);
    const bySeason: Record<number, number> = {};
    for (const w of winners) bySeason[w.season] = (bySeason[w.season] ?? 0) + 1;
    expect(bySeason).toEqual({ 2016: 9, 2017: 9, 2018: 9, 2019: 9, 2020: 9, 2021: 9, 2022: 8, 2023: 9, 2024: 9, 2025: 9, 2026: 2 });
  });
  it('reads a row: player, team first, opponents, date, score after the goal', () => {
    expect(winners[0]).toEqual({
      season: 2016, player: 'Cristhian Stuani', team: 'Middlesbrough', clubs: ['Middlesbrough', 'Sunderland'],
      when: '2016-08-21', date: '2016-08-21', score: [1, 0],
    });
  });
  it('reads a name wrapped in {{nowrap}}', () => {
    expect(winners.find((w) => w.date === '2018-12-22')).toMatchObject({ player: 'Andros Townsend', team: 'Crystal Palace', score: [2, 1] });
  });
  it('reads italic links and ampersands', () => {
    expect(winners.at(-1)).toMatchObject({ player: 'Lewis Dunk', team: 'Brighton & Hove Albion', clubs: ['Brighton & Hove Albion', 'Coventry City'], score: [5, 0] });
  });
  it('gives every winner a score', () => {
    expect(winners.every((w) => w.score)).toBe(true);
  });
});

describe('isoDate', () => {
  it('reads "21 August 2016"', () => {
    expect(isoDate('21 August 2016')).toBe('2016-08-21');
    expect(isoDate('1 May 2021')).toBe('2021-05-01');
    expect(isoDate('Smarch 1')).toBeNull();
  });
});
