import { describe, it, expect } from 'vitest';
import { slotObscurityScore, boardObscurityScore } from '../../src/lib/fame/obscurity';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, fame: number): Player => ({
  id, name: id, aliases: [], nation: 'X', clubIds: [], leagueIds: [],
  positions: ['FWD'], fame: { value: fame, source: 'sitelinks' },
});

// Real measured values from spec 11.2.
const mbappe = mk('mbappe', 133);
const benzema = mk('benzema', 107);
const mariano = mk('mariano', 45);
const answerSet = [mbappe, benzema, mariano];

describe('slotObscurityScore', () => {
  it('rewards the least famous valid answer most', () => {
    const a = slotObscurityScore(mariano, answerSet);
    const b = slotObscurityScore(benzema, answerSet);
    const c = slotObscurityScore(mbappe, answerSet);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it('scores 100 for the most obscure and 0 for the most famous', () => {
    expect(slotObscurityScore(mariano, answerSet)).toBe(100);
    expect(slotObscurityScore(mbappe, answerSet)).toBe(0);
  });

  it('scores 50 when every valid answer is equally famous', () => {
    const flat = [mk('a', 20), mk('b', 20)];
    expect(slotObscurityScore(flat[0]!, flat)).toBe(50);
  });

  it('scores 50 for a single-answer slot, which carries no information', () => {
    expect(slotObscurityScore(mariano, [mariano])).toBe(50);
  });

  it('scores 0 for a player outside the answer set', () => {
    expect(slotObscurityScore(mk('other', 10), answerSet)).toBe(0);
  });
});

describe('boardObscurityScore', () => {
  it('averages the slot scores', () => {
    const total = boardObscurityScore(
      { ST: mariano, LW: mbappe },
      { ST: answerSet, LW: answerSet },
    );
    expect(total).toBe(50);
  });

  it('is zero for an empty board', () => {
    expect(boardObscurityScore({}, {})).toBe(0);
  });
});
