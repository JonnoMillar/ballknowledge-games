import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dailyPool, extend, EPOCH } from '../lib/day';
import { drama } from '../lib/drama';
import { squadHints } from '../lib/squad';
import { fifths, nearestRival, parseResults, positions } from '../lib/table';
import type { StoredData, StoredDay } from '../lib/types';
import { parseTopScorer } from '../lib/wiki';
import { pickEndless, playable, view } from '../server';

const data = JSON.parse(readFileSync('games/season-line/data/seasons.json', 'utf8')) as StoredData;
const days = JSON.parse(readFileSync('games/season-line/data/days.json', 'utf8')) as StoredDay[];
const season = (id: string) => data.seasons.find((s) => s.id === id)!;

describe('tables', () => {
  it('reads results by column name and ranks on points, goal difference, goals', () => {
    const csv = 'Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG\nE0,10/08/24,15:00,A,B,2,0\nE0,10/08/24,15:00,C,D,1,1\nE0,17/08/24,15:00,B,C,3,0\nE0,17/08/24,15:00,D,A,0,0';
    const games = parseResults(csv);
    expect(games[0]).toEqual({ date: '2024-08-10', home: 'A', away: 'B', hg: 2, ag: 0 });
    expect(positions(games, '2024-25')).toEqual({ A: [1, 1], B: [4, 2], C: [2, 4], D: [3, 3] }); // C and D level on everything: by name
  });

  it('matches the real seasons: champions, and the deductions land', () => {
    const final = (id: string, club: string) => season(id).table[club]!.at(-1);
    expect(season('2015-16').champion).toBe('Leicester');
    expect(season('2003-04').champion).toBe('Arsenal');
    expect(season('1994-95').champion).toBe('Blackburn');
    expect(final('2013-14', 'Liverpool')).toBe(2);
    expect(final('2009-10', 'Portsmouth')).toBe(20);
    expect(final('2023-24', 'Everton')).toBe(15);
    expect(final('2004-05', 'West Brom')).toBe(17);
    // Newcastle led 95/96 for 29 games.
    expect(season('1995-96').table.Newcastle!.slice(0, 29).every((p) => p === 1)).toBe(true);
    for (const s of data.seasons) {
      const n = Object.keys(s.table).length;
      expect(s.games).toBe(2 * (n - 1));
      for (const line of Object.values(s.table)) expect(line).toHaveLength(s.games);
    }
  });

  it('grows by fifths', () => {
    expect(fifths(38)).toEqual([8, 15, 23, 30, 38]);
    expect(fifths(42)).toEqual([8, 17, 25, 34, 42]);
  });

  it('finds the rival that tangled most', () => {
    expect(nearestRival(season('2013-14').table, 'Liverpool')).toBe('Chelsea');
    expect(nearestRival(season('2011-12').table, 'Man City')).toBe('Man United');
  });
});

describe('top scorers', () => {
  it('parses links, piped links, ties and tallies', () => {
    expect(parseTopScorer('<br>[[Luis Suárez (Uruguayan footballer)|Luis Suárez]] (31)')).toEqual({ names: ['Luis Suárez'], goals: 31 });
    expect(parseTopScorer('[[Iwan Roberts|Roberts]] (9)')).toEqual({ names: ['Iwan Roberts'], goals: 9 });
    expect(parseTopScorer('<br>[[Rúben Neves]]<br>[[Daniel Podence]]<br>(6 each)')).toEqual({ names: ['Rúben Neves', 'Daniel Podence'], goals: 6 });
    expect(parseTopScorer('[[Thierry Henry]] (30 goals)')).toEqual({ names: ['Thierry Henry'], goals: 30 });
    expect(parseTopScorer('TBD')).toBeNull();
  });

  it('every finished season has a tally for nearly every club', () => {
    const all = data.seasons.flatMap((s) => Object.values(s.top));
    expect(all.filter((f) => parseTopScorer(f)).length / all.length).toBeGreaterThan(0.98);
  });
});

describe('squad hints', () => {
  const st = (name: string, fame: number, from: number, to: number | null, apps: number) => ({ name, fame, from, to, apps });
  it('trusts seasons inside a stint, skips the top scorer, the star last', () => {
    const hints = squadHints([
      st('Arriving (footballer)', 40, 2015, 2019, 120), // 2015/16 is his first season: an edge
      st('Inside A', 30, 2012, 2018, 150),
      st('Inside B', 60, 2013, 2017, 120),
      st('Inside C', 45, 2011, 2019, 200),
      st('Scorer', 90, 2010, 2020, 300),
      st('Bench', 50, 2012, 2018, 40),
    ], 2015, ['Scorer']);
    expect(hints).toEqual(['Inside C', 'Inside B']);
  });
  it('falls back to the edges, and gives up below two', () => {
    expect(squadHints([st('New', 40, 2015, 2016, 30), st('Old', 30, 2014, 2016, 60)], 2015, [])).toEqual(['Old', 'New']);
    expect(squadHints([st('Alone', 40, 2010, 2020, 300)], 2015, [])).toBeNull();
  });
});

describe('drama', () => {
  it('leaves a flat mid-table line out', () => {
    expect(drama(Array(38).fill(10), 20, 10).stories).toEqual([]);
  });
  it('finds the famous ones', () => {
    const story = (id: string, club: string) => data.boards.find((b) => b.id === `${id}|${club}`)?.stories ?? [];
    expect(story('2015-16', 'Leicester')).toContain('title');
    expect(story('2013-14', 'Liverpool')).toContain('chase');
    expect(story('1995-96', 'Newcastle')).toContain('chase');
    expect(story('2004-05', 'West Brom')).toContain('escape');
    expect(story('2003-04', 'Arsenal')).toContain('title');
  });
  it('every board has two squad players and a top scorer', () => {
    for (const b of data.boards) {
      expect(b.squad).toHaveLength(2);
      expect(b.squad[0]).not.toBe(b.squad[1]);
      expect(b.top.names.length).toBeGreaterThan(0);
      expect(b.top.names.some((n) => b.squad.includes(n))).toBe(false);
    }
  });
});

describe('the daily schedule', () => {
  it('runs from day 1, one known daily board a day, at least two weeks ahead', () => {
    const pool = new Set(dailyPool(data.boards).map((b) => b.id));
    expect(pool.size).toBeGreaterThan(150);
    expect(days[0]!.date).toBe(EPOCH);
    days.forEach((d, i) => { if (i) expect(Date.parse(d.date) - Date.parse(days[i - 1]!.date)).toBe(86400000); });
    for (const d of days) expect(pool.has(d.board)).toBe(true);
    const today = new Date().toISOString().slice(0, 10);
    expect(days.at(-1)!.date >= today).toBe(true);
  });
  it('is append-only: extending keeps every day already scheduled', () => {
    const more = extend(data.boards, days.slice(0, 20), days.at(-1)!.date);
    expect(more.slice(0, 20)).toEqual(days.slice(0, 20));
  });
});

describe('the server', () => {
  const today = new Date().toISOString().slice(0, 10);
  const answer = () => {
    const b = data.boards.find((x) => x.id === days.find((d) => d.date === today)!.board)!;
    return b;
  };

  it('shows a fifth, then grows with each miss, with the hints in order, and no answer until the end', async () => {
    const b = answer();
    const wrongClub = data.seasons.find((s) => s.start === b.start)!;
    const other = Object.keys(wrongClub.table).find((c) => c !== b.club)!;
    const miss = { club: other, start: b.start };
    const v0 = (await view(today, []))!;
    expect(v0.line).toHaveLength(8);
    expect(v0.answer).toBeNull();
    expect(v0.rival).toBeNull();
    expect(JSON.stringify(v0)).not.toContain(b.season);
    const steps = await Promise.all([1, 2, 3, 4].map((k) => view(today, Array(k).fill(miss))));
    expect(steps.map((v) => v!.line.length)).toEqual([15, 23, 30, 38]);
    expect(steps.map((v) => v!.hints.squad.length)).toEqual([1, 1, 2, 2]);
    expect(steps.map((v) => !!v!.rival)).toEqual([false, true, true, true]);
    expect(steps.map((v) => !!v!.hints.top)).toEqual([false, false, false, true]);
    expect(steps.every((v) => v!.answer === null)).toBe(true);
    const last = (await view(today, Array(5).fill(miss)))!;
    expect(last.done && !last.won && last.answer?.club === b.club).toBe(true);
  });

  it('locks in the right answer, judges the season up or down, and stops there', async () => {
    const b = answer();
    const clubSeasons = data.seasons.filter((s) => s.table[b.club] && s.start >= 2000).map((s) => s.start);
    const earlier = clubSeasons.find((s) => s < b.start), later = clubSeasons.find((s) => s > b.start);
    const g = [earlier, later].filter((s): s is number => s !== undefined).map((start) => ({ club: b.club, start }));
    const v = (await view(today, [...g, { club: b.club, start: b.start }, { club: b.club, start: b.start }]))!;
    expect(v.judged.map((j) => j.season)).toEqual([...(earlier !== undefined ? [1] : []), ...(later !== undefined ? [-1] : []), 0]);
    expect(v.won && v.done).toBe(true);
  });

  it('refuses what is not on the list, and dates it should not show', async () => {
    expect(await view(today, [{ club: 'Barcelona', start: 2010 }])).toBeNull();
    expect(await view(today, [{ club: 'Arsenal', start: 1995 }])).toBeNull(); // before the daily's years
    expect(playable('2026-10-14')).toBe(false);
    expect(playable('2999-01-01')).toBe(false);
    expect(await view('2015-16|Leicester', [])).toBeNull();
  });

  it('deals endless boards inside the years, never the front page example', async () => {
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      const id = (await pickEndless(1995, 1996, seen))!;
      if (!id) break;
      seen.push(id);
      const v = (await view(id, Array(5).fill({ club: 'Arsenal', start: 1995 })))!;
      expect(v.answer!.start).toBeGreaterThanOrEqual(1995);
      expect(v.answer!.start).toBeLessThanOrEqual(1996);
      expect(`${v.answer!.start}|${v.answer!.club}`).not.toBe('1995|Newcastle');
    }
    expect(seen.length).toBeGreaterThan(3);
    expect(await pickEndless(1990, 2000, [])).toBeNull();
  });
});
