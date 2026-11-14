import { describe, expect, it } from 'vitest';
import { bandWord, bestMoment, gradeScore, markOf, money, reportValue, runScore, shareLine, topPercent } from '../../src/lib/run/score';
import { RUN_TASKS } from '../../src/lib/run/tasks';
import { streakOf } from '../../src/lib/run/progress';

describe('run score', () => {
  it('is the mean to one decimal', () => {
    expect(runScore([75, 50.4])).toBe(62.7);
    expect(runScore([])).toBe(0);
  });

  it('shows as the report value in the spec table', () => {
    const table: [number, string][] = [[0, '£1.0m'], [22, '£2.9m'], [40, '£7.0m'], [55, '£14.6m'], [60, '£18.7m'], [70, '£30.4m'], [74, '£37.0m'], [85, '£63.3m'], [100, '£131.5m']];
    for (const [r, s] of table) expect(money(reportValue(r))).toBe(s);
  });

  it('bands on the site scale', () => {
    expect([0, 39.9, 40, 54.9, 55, 69.9, 70, 84.9, 85, 100].map(bandWord))
      .toEqual(['Basic', 'Basic', 'Decent', 'Decent', 'Solid', 'Solid', 'Sharp', 'Sharp', 'Elite', 'Elite']);
  });

  it('reads Top X% off our scale', () => {
    expect(topPercent(74)).toBe(18);
    expect(topPercent(85)).toBe(5);
    expect(topPercent(60)).toBe(50);
    expect(topPercent(100)).toBe(1);
  });

  it('marks by shape bands', () => {
    expect([100, 80, 79.9, 40, 39.9, 0].map(markOf)).toEqual(['clean', 'clean', 'partial', 'partial', 'miss', 'miss']);
  });

  it('places a graded pick inside its grade', () => {
    expect(gradeScore(null)).toBe(0);
    expect(gradeScore('basic', 0)).toBe(40);
    expect(gradeScore('solid', 0.5)).toBe(77);
    expect(gradeScore('elite', 1)).toBe(100);
    expect(gradeScore('sharp', 7)).toBe(94);
  });
});

describe('best moment', () => {
  it('ranks finds by their own item, not the task average', () => {
    expect(bestMoment({ spoofed: { score: 50, find: 'spoof', findScore: 100 }, step: { score: 46, find: 'step', findScore: 92 } })).toBe('spoof');
    expect(bestMoment({ spoofed: { score: 75, find: 'spoof', findScore: 100 }, step: { score: 48, find: 'step', findScore: 100 } })).toBe('step');
  });
  it('takes the highest scoring find, ties to Steps first', () => {
    expect(bestMoment({ spoofed: { score: 100, find: 'spoof' }, step: { score: 100, find: 'step' } })).toBe('step');
    expect(bestMoment({ spoofed: { score: 100, find: 'spoof' }, step: { score: 90, find: 'step' } })).toBe('spoof');
  });
  it('names the best task plainly with no find', () => {
    expect(bestMoment({ spoofed: { score: 25 }, step: { score: 48 } })).toBe(`Best task: ${RUN_TASKS[1]!.name}`);
    expect(bestMoment({})).toBeNull();
  });
});

describe('share line', () => {
  it('matches the spec card', () => {
    expect(shareLine({ day: 55, archive: false, r: 74, marks: ['clean', 'clean', 'partial', 'clean', 'miss', 'clean'], streak: 12 })).toBe(
      "Today's assignment #55\nBall knowledge: Sharp\nReport valued at £37.0m\n✅✅🔸✅❌✅\nTop 18% on our scale\n🔥 12\nballknowledge-games.vercel.app",
    );
  });
  it('drops Top X% below the top half, and the streak on an archive run', () => {
    expect(shareLine({ day: 41, archive: true, r: 30, marks: ['miss'], streak: 9 })).toBe(
      'Assignment #41\nBall knowledge: Basic\nReport valued at £4.3m\n❌\nballknowledge-games.vercel.app',
    );
  });
});

describe('streak', () => {
  it('counts days in a row; today unplayed breaks nothing', () => {
    expect(streakOf(['2026-11-10', '2026-11-11', '2026-11-12'], '2026-11-13')).toMatchObject({ current: 3, best: 3 });
  });
  it('ends on a missed day with nothing banked', () => {
    expect(streakOf(['2026-11-09', '2026-11-11', '2026-11-12'], '2026-11-12')).toMatchObject({ current: 2, best: 2 });
  });
  it('spends a rest day earned by seven in a row', () => {
    const week = Array.from({ length: 7 }, (_, i) => `2026-11-0${i + 1}`);
    const s = streakOf([...week, '2026-11-09'], '2026-11-09');
    expect(s).toMatchObject({ current: 8, banked: 0, rests: ['2026-11-08'] });
  });
});
