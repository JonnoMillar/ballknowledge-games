import { describe, expect, it } from 'vitest';
import {
  addDays, daysBetween, isDate, monthName, seasonLabel, seasonOf, seasonTag, spanTitle, utcToday, weekEnd,
} from '../lib/dates';

describe('isDate', () => {
  it('takes real calendar dates only', () => {
    expect(isDate('2026-10-08')).toBe(true);
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('2026-1-8')).toBe(false);
    expect(isDate('../etc')).toBe(false);
  });
});

describe('day arithmetic', () => {
  it('adds days across a year end', () => {
    expect(addDays('2026-10-09', 1)).toBe('2026-10-10');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-09', -4)).toBe('2026-10-05');
  });
  it('counts days between', () => {
    expect(daysBetween('2026-10-09', '2026-10-16')).toBe(7);
    expect(daysBetween('2026-10-09', '2026-10-08')).toBe(-1);
  });
  it('takes today in UTC', () => {
    expect(utcToday(new Date('2026-10-09T23:30:00Z'))).toBe('2026-10-09');
  });
});

describe('weekEnd', () => {
  it('is the Monday ending the Tuesday-to-Monday week', () => {
    expect(weekEnd('2026-10-13')).toBe('2026-10-19'); // Tuesday
    expect(weekEnd('2026-10-18')).toBe('2026-10-19'); // Sunday
    expect(weekEnd('2026-10-19')).toBe('2026-10-19'); // Monday
    expect(weekEnd('2026-10-12')).toBe('2026-10-12'); // the Monday before
  });
});

describe('seasons', () => {
  it('starts a season in July', () => {
    expect(seasonOf('2026-10-09')).toBe(2026);
    expect(seasonOf('2027-05-20')).toBe(2026);
    expect(seasonOf('2027-07-01')).toBe(2027);
  });
  it('writes a season for ids and for people', () => {
    expect(seasonTag(2026)).toBe('2026-27');
    expect(seasonTag(2099)).toBe('2099-00');
    expect(seasonLabel(2026)).toBe('2026/27');
  });
});

describe('titles', () => {
  it('names a month', () => {
    expect(monthName('2026-09')).toBe('September');
    expect(monthName('2027-01-03')).toBe('January');
  });
  it('writes a span of match dates', () => {
    expect(spanTitle('2026-10-17', '2026-10-19')).toBe('17–19 October');
    expect(spanTitle('2026-09-30', '2026-10-06')).toBe('30 September – 6 October');
    expect(spanTitle('2026-10-17', '2026-10-17')).toBe('17 October');
  });
});
