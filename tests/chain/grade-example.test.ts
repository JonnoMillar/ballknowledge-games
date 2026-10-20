import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GRADES, GRADE_EXAMPLE, ELITE_MIN_FIELD, gradeOf } from '../../src/lib/chain/grade';

/** Fame below which an answer cannot be checked; the same floor Steps and Deep Cuts use. */
const CHECKABLE = 30;

describe('the grades key example', () => {
  const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as { id: string; name: string; clubIds: string[]; fame: { value: number } }[];
  const field = pool.filter((p) => p.clubIds.includes(GRADE_EXAMPLE.club));
  const deepest = Math.min(...field.filter((p) => p.fame.value >= CHECKABLE).map((p) => p.fame.value));

  it.each(GRADES)('the %s pick grades %s on the plain club field', (g) => {
    const pick = GRADE_EXAMPLE.picks[g];
    const me = field.find((p) => p.id === pick.id);
    expect(me?.name).toBe(pick.name);
    const above = field.filter((p) => p.id !== pick.id && p.fame.value > me!.fame.value).length;
    const elite = field.length >= ELITE_MIN_FIELD && me!.fame.value <= deepest;
    expect(gradeOf(above, field.length, elite)).toBe(g);
  });
});
