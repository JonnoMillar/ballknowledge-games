import { describe, it, expect } from 'vitest';
import { gradeOf, pageGrade, toGrade, GRADES } from '../../src/lib/chain/grade';
import { deepShareLine } from '../../src/lib/chain/share';
import { addCard, sortedCards, type Card } from '../../src/lib/collection';

describe('gradeOf', () => {
  it('the most findable answer is Basic', () => {
    expect(gradeOf(0, 40, false)).toBe('basic');
  });

  it('climbs with the share of the field better known than the pick', () => {
    // A field of 41: 40 others, so `above` is the share in fortieths.
    expect(gradeOf(3, 41, false)).toBe('basic'); // 7.5%
    expect(gradeOf(4, 41, false)).toBe('decent'); // 10%
    expect(gradeOf(10, 41, false)).toBe('solid'); // 25%
    expect(gradeOf(18, 41, false)).toBe('sharp'); // 45%
    expect(gradeOf(40, 41, false)).toBe('sharp');
  });

  it('never runs backwards: going deeper never earns a lower grade', () => {
    let last = -1;
    for (let above = 0; above < 60; above++) {
      const rank = GRADES.indexOf(gradeOf(above, 60, false));
      expect(rank).toBeGreaterThanOrEqual(last);
      last = rank;
    }
  });

  it('Elite is decided by the caller and beats everything', () => {
    expect(gradeOf(0, 40, true)).toBe('elite');
  });

  it('a field of one is Basic, not a division by zero', () => {
    expect(gradeOf(0, 1, false)).toBe('basic');
  });
});

describe('toGrade', () => {
  it('reads the old six grades as the five', () => {
    expect(['common', 'uncommon', 'rare', 'niche', 'gem', 'grail'].map(toGrade))
      .toEqual(['basic', 'decent', 'solid', 'sharp', 'sharp', 'elite']);
  });

  it('passes the new ones through and drops anything else', () => {
    expect(toGrade('sharp')).toBe('sharp');
    expect(toGrade('bogus')).toBeNull();
    expect(toGrade(null)).toBeNull();
  });
});

describe('pageGrade', () => {
  it('is the weakest plate', () => {
    expect(pageGrade(['sharp', 'decent'])).toBe('decent');
    expect(pageGrade(['elite', 'elite'])).toBe('elite');
  });

  it('is nothing when a plate broke', () => {
    expect(pageGrade(['sharp', null])).toBeNull();
    expect(pageGrade([])).toBeNull();
  });
});

describe('deepShareLine', () => {
  it('shows each plate\'s case and the page, never a name', () => {
    expect(deepShareLine({ title: 'Deep Cuts 104', grades: ['sharp', 'solid'] })).toBe('Deep Cuts 104\n🟦🟨 Solid page');
  });

  it('marks a broken plate red and the page broken', () => {
    expect(deepShareLine({ title: 'Deep Cuts 104', grades: ['sharp', null] })).toBe('Deep Cuts 104\n🟦🟥 broken');
  });
});

describe('the collection', () => {
  const card = (id: string, grade: Card['grade'], date = '2026-09-27'): Card =>
    ({ id, name: id, grade, board: '101', via: [], clubs: [], date });

  it('a first find is new', () => {
    const { collection, news } = addCard({}, card('Q1', 'solid'));
    expect(news).toBe('new');
    expect(collection.Q1!.grade).toBe('solid');
  });

  it('keeps the better grade, and says when it went up', () => {
    const start = { Q1: card('Q1', 'solid') };
    expect(addCard(start, card('Q1', 'sharp')).news).toBe('upgraded');
    const worse = addCard(start, card('Q1', 'basic'));
    expect(worse.news).toBeNull();
    expect(worse.collection.Q1!.grade).toBe('solid');
  });

  it('does not change the collection it was given', () => {
    const start = { Q1: card('Q1', 'solid') };
    addCard(start, card('Q1', 'elite'));
    expect(start.Q1.grade).toBe('solid');
  });

  it('sorts rarest first, then newest', () => {
    const sorted = sortedCards({
      a: card('a', 'basic'), b: card('b', 'elite'), c: card('c', 'solid', '2026-09-20'), d: card('d', 'solid', '2026-09-26'),
    });
    expect(sorted.map((c) => c.id)).toEqual(['b', 'd', 'c', 'a']);
  });
});
