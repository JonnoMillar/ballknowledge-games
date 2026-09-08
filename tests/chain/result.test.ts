import { describe, it, expect } from 'vitest';
import { chainResult, shareText } from '../../src/lib/chain/result';
import type { ChainPuzzle } from '../../src/lib/chain/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (
  id: string, nation: string, clubs: string[], fame: number, leagues = clubs.map((c) => `L_${c}`),
): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs, leagueIds: leagues,
  positions: ['MID'], fame: { value: fame, source: 'sitelinks' },
});

// a and c share nothing. Three players bridge them, at three levels of fame.
const a = mk('a', 'BRA', ['CITY'], 100);
const c = mk('c', 'ITA', ['ROMA'], 90);
const obscureBridge = mk('obscureBridge', 'JPN', ['CITY', 'ROMA'], 10);
const midBridge = mk('midBridge', 'FRA', ['CITY', 'ROMA'], 55);
const famousBridge = mk('famousBridge', 'GER', ['CITY', 'ROMA'], 90);
// Links to nobody in this puzzle.
const stranger = mk('stranger', 'ARG', ['FLA'], 30);

const players = [a, c, obscureBridge, midBridge, famousBridge, stranger];
const pool = new Map(players.map((p) => [p.id, p]));

const puzzle: ChainPuzzle = { id: 'test', mode: 'clubs', slots: ['a', null, 'c'] };

describe('chainResult', () => {
  it('scores a pick by how deep it dug, not by whether it was legal', () => {
    const deep = chainResult(['a', 'obscureBridge', 'c'], puzzle, players, pool);
    const shallow = chainResult(['a', 'famousBridge', 'c'], puzzle, players, pool);

    expect(deep.perfect).toBe(true);
    expect(shallow.perfect).toBe(true);
    // Both chains held; only the obscurity separates them. That difference is
    // the entire reason to play again.
    expect(deep.score).toBeGreaterThan(shallow.score);
  });

  it('scores a broken chain zero however famous the pick was', () => {
    const r = chainResult(['a', 'stranger', 'c'], puzzle, players, pool);
    expect(r.perfect).toBe(false);
    expect(r.made).toBe(0);
    expect(r.score).toBe(0);
    expect(r.slots[0]!.held).toBe(false);
  });

  it('reports the deepest answer that was available, not the one played', () => {
    const r = chainResult(['a', 'famousBridge', 'c'], puzzle, players, pool);
    expect(r.slots[0]!.best?.id).toBe('obscureBridge');
    // Three players bridge a and c.
    expect(r.slots[0]!.fieldSize).toBe(3);
  });

  it('measures the field against the puzzle, not against a wrong answer', () => {
    // The player put someone in who links to nothing. The field they missed is
    // still the field the puzzle offered, or the miss would be invented by the
    // mistake itself.
    const broken = chainResult(['a', 'stranger', 'c'], puzzle, players, pool);
    const fine = chainResult(['a', 'midBridge', 'c'], puzzle, players, pool);
    expect(broken.slots[0]!.fieldSize).toBe(fine.slots[0]!.fieldSize);
    expect(broken.slots[0]!.best?.id).toBe('obscureBridge');
  });

  it('stays on one scale as chains get longer', () => {
    // Two blanks rather than one, both filled with the deepest answer
    // available. A sum would double; a mean does not, which is what makes two
    // different boards comparable at all.
    const e = mk('e', 'ESP', ['ROMA', 'AJAX'], 10);
    const f = mk('f', 'NED', ['AJAX'], 95);
    const long: ChainPuzzle = { id: 'long', mode: 'clubs', slots: ['a', null, 'c', null, 'f'] };
    const longPlayers = [...players, e, f];
    const longPool = new Map(longPlayers.map((p) => [p.id, p]));

    const short = chainResult(['a', 'obscureBridge', 'c'], puzzle, players, pool);
    const r = chainResult(['a', 'obscureBridge', 'c', 'e', 'f'], long, longPlayers, longPool);

    expect(r.perfect).toBe(true);
    expect(r.total).toBe(4);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(Math.abs(r.score - short.score)).toBeLessThanOrEqual(50);
  });

  it('has no result at all for an empty chain', () => {
    const r = chainResult(['a', null, 'c'], puzzle, players, pool);
    expect(r.score).toBe(0);
    expect(r.perfect).toBe(false);
  });
});

describe('shareText', () => {
  it('shows the shape of the attempt and none of the answer', () => {
    const r = chainResult(['a', 'obscureBridge', 'c'], puzzle, players, pool);
    const text = shareText(r, '004');
    expect(text).toContain('🟩🟩');
    expect(text).toContain('004');
    // The whole point: a friend who has not played can still play. Only the
    // fixture names long enough to be distinctive are checked — 'a' and 'c'
    // appear inside "Chain" and "Recall" and would fail on the header alone.
    for (const p of players.filter((q) => q.name.length > 3)) {
      expect(text).not.toContain(p.name);
    }
  });

  it('says a broken chain is broken rather than reporting a score', () => {
    const r = chainResult(['a', 'stranger', 'c'], puzzle, players, pool);
    expect(shareText(r, '004')).toContain('broken');
  });
});
