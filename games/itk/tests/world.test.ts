import { describe, expect, it } from 'vitest';
import { buildTrail, photoYearOf, type Stint } from '../lib/world';

const noReserve = () => false;
const st = (q: string, from: number, to: number, apps: number, loan = false): Stint => ({ q, title: q, from, to, apps, loan });

describe('buildTrail', () => {
  it('shows the loan parent and the return when the parent spell runs on', () => {
    // Courtois: Chelsea → Atlético (loan) → back to Chelsea → Real.
    const t = buildTrail([st('Genk', 2009, 2011, 41), st('Chelsea', 2011, 2018, 126), st('Atleti', 2011, 2014, 111, true), st('Real', 2018, 2024, 150)], noReserve);
    expect(t.map((s) => `${s.q}${s.loan ? '(loan)' : ''}${s.ret ? '(ret)' : ''}@${s.from}`)).toEqual(['Genk@2009', 'Chelsea@2011', 'Atleti(loan)@2011', 'Chelsea(ret)@2014', 'Real@2018']);
  });

  it('keeps a parent with no games only when it loaned him out', () => {
    const t = buildTrail([st('Liverpool', 2013, 2021, 0), st('Crewe', 2015, 2016, 30, true), st('Derby', 2018, 2019, 40, true), st('Fulham', 2021, 2024, 90), st('Ghost', 2010, 2011, 0)], noReserve);
    // A gap between the loans is a spell back at the parent.
    expect(t.map((s) => s.q)).toEqual(['Liverpool', 'Crewe', 'Liverpool', 'Derby', 'Liverpool', 'Fulham']);
  });

  it('back-to-back loans do not show a return between them', () => {
    const t = buildTrail([st('Chelsea', 2010, 2016, 10), st('A', 2011, 2012, 30, true), st('B', 2012, 2013, 30, true), st('C', 2016, 2020, 90)], noReserve);
    expect(t.map((s) => s.q)).toEqual(['Chelsea', 'A', 'B', 'Chelsea', 'C']);
  });

  it('drops reserve sides and merges consecutive spells at one club', () => {
    const t = buildTrail([{ ...st('Q1', 2005, 2006, 20), title: 'Real Madrid Castilla' }, st('Q2', 2006, 2008, 30), st('Q2', 2008, 2010, 40), st('Q3', 2010, 2012, 50)], noReserve);
    expect(t).toEqual([
      { q: 'Q2', from: 2006, loan: false, apps: 70, ret: false },
      { q: 'Q3', from: 2010, loan: false, apps: 50, ret: false },
    ]);
  });
});

describe('photoYearOf', () => {
  it('reads the photo production shows', () => {
    expect(photoYearOf({ source: 'commons', year: 2012 })).toBe(2012);
    expect(photoYearOf({ source: 'cutout', alt: { year: 2015 } })).toBe(2015);
    expect(photoYearOf({ source: 'cutout', alt: null })).toBeNull();
    expect(photoYearOf({ source: 'none' })).toBeNull();
    expect(photoYearOf(undefined)).toBeUndefined();
  });
});
