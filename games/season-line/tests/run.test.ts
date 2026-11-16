import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clashes, extendRun, problems, runPool, runScore, RUN_SL_FAME_CAP, RUN_SL_START, WINDOW, type RunSlDay } from '../lib/run';
import { extend } from '../lib/day';
import { runView } from '../server';
import type { StoredData, StoredDay } from '../lib/types';

const data = JSON.parse(readFileSync('games/season-line/data/seasons.json', 'utf8')) as StoredData;
const daily = JSON.parse(readFileSync('games/season-line/data/days.json', 'utf8')) as StoredDay[];
const run = JSON.parse(readFileSync('games/season-line/data/run.json', 'utf8')) as RunSlDay[];
const [first, last] = [data.seasons[0]!.start, data.seasons.at(-1)!.start];

describe('the run pool', () => {
  it('is mid-fame stories from 2000, never a title', () => {
    const pool = runPool(data.boards);
    expect(pool.length).toBeGreaterThan(100);
    for (const b of pool) {
      expect(b.start).toBeGreaterThanOrEqual(2000);
      expect(b.stories).not.toContain('title');
      expect(b.score + 2 * b.fame).toBeLessThan(RUN_SL_FAME_CAP);
    }
  });
});

describe('the run schedule', () => {
  it('keeps every promise, clear of the daily, from its start', () => {
    expect(run[0]!.date).toBe(RUN_SL_START);
    for (const d of run) expect(problems(data.boards, d, run, daily, first, last)).toEqual([]);
  });
  it('runs a year and is the same every time', () => {
    const year = extendRun(data.boards, [], daily, '2027-11-12', first, last);
    expect(year).toHaveLength(365);
    expect(extendRun(data.boards, [], daily, '2026-11-22', first, last)).toEqual(year.slice(0, 10));
  });
  it('places the answer anywhere in its window, not always the middle', () => {
    const at = new Set(run.map((d) => Number(d.board.slice(0, 4)) - d.from));
    expect(at.size).toBeGreaterThan(2);
    for (const d of run) expect(Number(d.board.slice(0, 4)) - d.from).toBeLessThan(WINDOW);
  });
  it('the daily keeps clear of the run when it extends', () => {
    const more = extend(data.boards, daily, '2027-03-01', undefined, run);
    for (const d of more.slice(daily.length)) expect(clashes(d.board, d.date, run)).toBe(false);
  });
});

describe('scoring', () => {
  it('club 80/55/30, season +20 on the first go or +10 on the second', () => {
    expect(runScore(1, 1)).toBe(100);
    expect(runScore(2, 2)).toBe(65);
    expect(runScore(3, null)).toBe(30);
    expect(runScore(null, 1)).toBe(20);
    expect(runScore(null, null)).toBe(0);
  });
});

describe('serving a run board', () => {
  const d = run[0]!;
  const club = d.board.split('|')[1]!;
  const wrong = data.boards.find((b) => b.club !== club && b.start >= d.from && b.start < d.from + WINDOW)!.club;
  it('hides the club until named, adds a hint a miss, then takes the season', async () => {
    const v0 = (await runView(d.date, []))!;
    expect(v0.line).toHaveLength(v0.games);
    expect(v0.club).toBeNull();
    expect(v0.hints).toEqual({ squad: null, top: null });
    expect(JSON.stringify(v0)).not.toContain(d.board.slice(0, 7));
    const v1 = (await runView(d.date, [wrong]))!;
    expect(v1.hints.squad).not.toBeNull();
    expect(v1.hints.top).toBeNull();
    const v2 = (await runView(d.date, [wrong, club]))!;
    expect(v2.clubAt).toBe(2);
    expect(v2.club?.club).toBe(club);
    expect(v2.season).toBeNull();
    expect(v2.hints.top).toBeNull();
    const start = Number(d.board.slice(0, 4));
    const miss = start === d.from ? d.from + 1 : d.from;
    const v3 = (await runView(d.date, [wrong, club], [miss]))!;
    expect(v3.season).toBeNull();
    expect(v3.picks).toEqual([{ picked: miss, dir: miss > start ? 'earlier' : 'later' }]);
    expect(JSON.stringify(v3)).not.toContain(`"start":${start}`);
    const v4 = (await runView(d.date, [wrong, club], [miss, start]))!;
    expect(v4.season).toMatchObject({ start, at: 2, picked: start });
    const v5 = (await runView(d.date, [wrong, club], [start, miss]))!;
    expect(v5.picks).toHaveLength(1);
    expect(v5.season?.at).toBe(1);
    const v6 = (await runView(d.date, [wrong, club], [null, null]))!;
    expect(v6.season).toMatchObject({ at: null, picked: null });
  });
  it('a timeout is a miss; three misses show the club; bad input is refused', async () => {
    const v = (await runView(d.date, ['', '', '']))!;
    expect(v.clubAt).toBeNull();
    expect(v.club?.club).toBe(club);
    expect(await runView(d.date, ['Real Madrid'])).toBeNull();
    expect(await runView(d.date, [club], [d.from - 1])).toBeNull();
  });
});
