import { describe, it, expect } from 'vitest';
import { gradeOf, pageGrade, GRADES } from '../../src/lib/chain/grade';
import { deepShareLine } from '../../src/lib/chain/share';
import { addCard, sortedCards, type Card } from '../../src/lib/collection';

describe('gradeOf', () => {
  it('the most findable answer is Common', () => {
    expect(gradeOf(0, 40, false)).toBe('common');
  });

  it('climbs with the share of the field better known than the pick', () => {
    // A field of 41: 40 others, so `above` is the share in fortieths.
    expect(gradeOf(3, 41, false)).toBe('common'); // 7.5%
    expect(gradeOf(4, 41, false)).toBe('uncommon'); // 10%
    expect(gradeOf(10, 41, false)).toBe('rare'); // 25%
    expect(gradeOf(18, 41, false)).toBe('niche'); // 45%
    expect(gradeOf(28, 41, false)).toBe('gem'); // 70%
    expect(gradeOf(40, 41, false)).toBe('gem');
  });

  it('never runs backwards: going deeper never earns a lower grade', () => {
    let last = -1;
    for (let above = 0; above < 60; above++) {
      const rank = GRADES.indexOf(gradeOf(above, 60, false));
      expect(rank).toBeGreaterThanOrEqual(last);
      last = rank;
    }
  });

  it('Grail is decided by the caller and beats everything', () => {
    expect(gradeOf(0, 40, true)).toBe('grail');
  });

  it('a field of one is Common, not a division by zero', () => {
    expect(gradeOf(0, 1, false)).toBe('common');
  });
});

describe('pageGrade', () => {
  it('is the weakest plate', () => {
    expect(pageGrade(['gem', 'uncommon'])).toBe('uncommon');
    expect(pageGrade(['grail', 'grail'])).toBe('grail');
  });

  it('is nothing when a plate broke', () => {
    expect(pageGrade(['gem', null])).toBeNull();
    expect(pageGrade([])).toBeNull();
  });
});

describe('deepShareLine', () => {
  it('shows each plate\'s case and the page, never a name', () => {
    expect(deepShareLine({ title: 'Deep Cuts 104', grades: ['gem', 'rare'] })).toBe('Deep Cuts 104\n💎🟨 Rare page');
  });

  it('marks a broken plate red and the page broken', () => {
    expect(deepShareLine({ title: 'Deep Cuts 104', grades: ['niche', null] })).toBe('Deep Cuts 104\n🟦🟥 broken');
  });
});

describe('the collection', () => {
  const card = (id: string, grade: Card['grade'], date = '2026-09-27'): Card =>
    ({ id, name: id, grade, board: '101', via: [], clubs: [], date });

  it('a first find is new', () => {
    const { collection, news } = addCard({}, card('Q1', 'rare'));
    expect(news).toBe('new');
    expect(collection.Q1!.grade).toBe('rare');
  });

  it('keeps the better grade, and says when it went up', () => {
    const start = { Q1: card('Q1', 'rare') };
    expect(addCard(start, card('Q1', 'gem')).news).toBe('upgraded');
    const worse = addCard(start, card('Q1', 'common'));
    expect(worse.news).toBeNull();
    expect(worse.collection.Q1!.grade).toBe('rare');
  });

  it('does not change the collection it was given', () => {
    const start = { Q1: card('Q1', 'rare') };
    addCard(start, card('Q1', 'grail'));
    expect(start.Q1.grade).toBe('rare');
  });

  it('sorts rarest first, then newest', () => {
    const sorted = sortedCards({
      a: card('a', 'common'), b: card('b', 'grail'), c: card('c', 'rare', '2026-09-20'), d: card('d', 'rare', '2026-09-26'),
    });
    expect(sorted.map((c) => c.id)).toEqual(['b', 'd', 'c', 'a']);
  });
});
