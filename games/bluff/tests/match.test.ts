import { describe, expect, it } from 'vitest';
import {
  LIVES, MAX_LOSSES_PER_ROUND, canPlant, dealt, guessed, newMatch, nextRound, planted, rematch, sheet, suggestions, uncovered,
  type At, type Match,
} from '../lib/match';
import type { Side } from '../lib/types';

const side = (key = 's1'): Side => ({
  key, team: 'Liverpool', opponent: 'Milan', date: '2005-05-25', comp: 'Champions League final', score: '3–3', formation: '4-4-2',
  lines: [
    [{ id: 'gk', name: 'Jerzy Dudek', pos: 'GK' }],
    [{ id: 'd1', name: 'Djimi Traoré', pos: 'LB' }, { id: 'd2', name: 'Sami Hyypiä', pos: 'CB' }, { id: 'd3', name: 'Jamie Carragher', pos: 'CB' }, { id: 'd4', name: 'Steve Finnan', pos: 'RB' }],
    [{ id: 'm1', name: 'John Arne Riise', pos: 'LM' }, { id: 'm2', name: 'Xabi Alonso', pos: 'CM' }, { id: 'm3', name: 'Steven Gerrard', pos: 'CM' }, { id: null, name: 'Luis García', pos: 'RM' }],
    [{ id: 'f1', name: 'Milan Baroš', pos: 'CF' }, { id: 'f2', name: 'Harry Kewell', pos: 'CF' }],
  ],
  help: {
    MID: [{ id: 'h1', name: 'Dietmar Hamann' }, { id: 'm2', name: 'Xabi Alonso' }, { id: 'h2', name: 'Igor Bišćan' }, { id: 'h3', name: 'Antonio Núñez' }],
    FWD: [{ id: 'h4', name: 'Djibril Cissé' }],
  },
});

const FAKE = { id: 'x', name: 'Emile Heskey' };
const AT: At = [2, 1];
const opts = { from: 1995, to: 2026, help: true };

/** A match at the guess, Ann bluffing and Ben guessing. */
const atGuess = (names = ['Ann', 'Ben']): Match => uncovered(planted(dealt(newMatch(names, opts), side()), AT, FAKE));

describe('a round', () => {
  it('goes deal, plant, cover, guess', () => {
    let m = newMatch(['Ann', 'Ben'], opts);
    expect(m.phase).toBe('deal');
    m = dealt(m, side());
    expect(m.phase).toBe('plant');
    expect(m.seen).toEqual(['s1']);
    m = planted(m, AT, FAKE);
    expect(m.phase).toBe('cover');
    expect(uncovered(m).phase).toBe('guess');
  });

  it('shows the fake in its slot, in the real one\'s position', () => {
    const m = atGuess();
    const s = sheet(m.round.side!, m.round.plant);
    expect(s[2]![1]).toEqual({ id: 'x', name: 'Emile Heskey', pos: 'CM' });
    expect(s[2]![2]!.name).toBe('Steven Gerrard');
  });

  it('will not plant someone already on the sheet, by id or by name', () => {
    expect(canPlant(side(), { id: 'd2', name: 'Sami Hyypiä' })).toBe(false);
    expect(canPlant(side(), { id: 'zz', name: 'Luis Garcia' })).toBe(false);
    const m = planted(dealt(newMatch(['Ann', 'Ben'], opts), side()), AT, { id: 'f1', name: 'Milan Baroš' });
    expect(m.phase).toBe('plant');
  });

  it('a right first tap costs nothing', () => {
    const m = guessed(atGuess(), AT);
    expect(m.phase).toBe('reveal');
    expect(m.round.caught).toBe(true);
    expect(m.players.map((p) => p.lives)).toEqual([LIVES, LIVES]);
  });

  it('a wrong tap costs a life and the guesser goes again', () => {
    const m = guessed(atGuess(), [0, 0]);
    expect(m.phase).toBe('guess');
    expect(m.players[1]!.lives).toBe(LIVES - 1);
    expect(m.round.wrong).toEqual([[0, 0]]);
    expect(guessed(m, [0, 0])).toBe(m);
  });

  it(`reveals after ${MAX_LOSSES_PER_ROUND} wrong taps`, () => {
    let m = atGuess();
    m = guessed(m, [0, 0]);
    m = guessed(m, [1, 0]);
    expect(m.phase).toBe('reveal');
    expect(m.round.caught).toBe(false);
    expect(m.players[1]!.lives).toBe(LIVES - MAX_LOSSES_PER_ROUND);
  });
});

describe('the match', () => {
  it('swaps roles each round', () => {
    const m = nextRound(guessed(atGuess(), AT));
    expect(m.phase).toBe('deal');
    expect([m.round.bluffer, m.round.guesser, m.round.no]).toEqual([1, 0, 2]);
  });

  it('rotates three players round the table', () => {
    let m = atGuess(['Ann', 'Ben', 'Cat']);
    m = nextRound(guessed(m, AT));
    expect([m.round.bluffer, m.round.guesser]).toEqual([1, 2]);
  });

  it('ends when one player has lives left', () => {
    let m = atGuess();
    m = { ...m, players: [m.players[0]!, { name: 'Ben', lives: 1 }] };
    m = guessed(m, [0, 0]);
    expect(m.phase).toBe('reveal');
    expect(m.winner).toBe(0);
    expect(nextRound(m)).toBe(m);
  });

  it('skips a player who is out', () => {
    let m = atGuess(['Ann', 'Ben', 'Cat']);
    m = { ...m, players: [m.players[0]!, { name: 'Ben', lives: 1 }, m.players[2]!] };
    m = nextRound(guessed(m, [0, 0]));
    expect([m.round.bluffer, m.round.guesser]).toEqual([2, 0]);
  });

  it('a rematch keeps the names and what has been seen', () => {
    const m = rematch(guessed(atGuess(), AT));
    expect(m.players).toEqual([{ name: 'Ann', lives: LIVES }, { name: 'Ben', lives: LIVES }]);
    expect(m.seen).toEqual(['s1']);
  });
});

describe('help the faker', () => {
  it('offers fakes for the slot\'s position, never someone in the XI', () => {
    const got = suggestions(side(), AT, 3, () => 0);
    expect(got).toHaveLength(3);
    expect(got.map((p) => p.id)).not.toContain('m2');
    expect(got.every((p) => ['h1', 'h2', 'h3'].includes(p.id))).toBe(true);
  });

  it('offers what there is', () => {
    expect(suggestions(side(), [3, 0]).map((p) => p.id)).toEqual(['h4']);
    expect(suggestions(side(), [0, 0])).toEqual([]);
  });
});
