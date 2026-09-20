import { describe, it, expect } from 'vitest';
import { alive, dealt, lost, newMatch, nextBall, passed, rematch, winner } from '../../src/lib/rondo/match';
import type { Carrier } from '../../src/lib/rondo/match';

const c = (id: string): Carrier => ({ id, name: id, ground: '#000' });
const start = (names: string[]) => dealt(newMatch(names, 30), c('kane'));

describe('a ball', () => {
  it('deals to the player whose turn it is, with everything open', () => {
    const m = start(['Jonno', 'Dave']);
    expect(m.ballNo).toBe(1);
    expect(m.carrier?.id).toBe('kane');
    expect(m.burnt).toEqual([]);
    expect(m.named).toEqual(['kane']);
    expect(m.turn).toBe(0);
  });

  it('a pass moves the ball, burns the clubs, and hands the turn on', () => {
    let m = start(['Jonno', 'Dave']);
    m = passed(m, c('lewa'), ['BAYERN'], ['BAYERN'], { BAYERN: { name: 'Bayern' } });
    expect(m.carrier?.id).toBe('lewa');
    expect(m.burnt).toEqual(['BAYERN']);
    expect(m.named).toEqual(['kane', 'lewa']);
    expect(m.trail.map((t) => t.id)).toEqual(['kane', 'lewa']);
    expect(m.turn).toBe(1);
    m = passed(m, c('messi'), ['BARCA'], ['BAYERN', 'BARCA'], {});
    expect(m.turn).toBe(0);
  });
});

describe('a loss', () => {
  it('gives the passer a bib and lets them kick off the next ball', () => {
    let m = start(['Jonno', 'Dave']);
    m = passed(m, c('lewa'), ['BAYERN'], ['BAYERN'], {});
    // Dave's pass; Dave loses it.
    m = lost(m, { reason: 'no-link', open: ['DORTMUND'] }, {});
    expect(m.players[1]!.bibs).toBe(1);
    expect(m.loss?.by).toBe(1);
    expect(m.loss?.carrier.id).toBe('lewa');
    expect(m.over).toBe(false);
    expect(m.turn).toBe(1);
    m = dealt(nextBall(m), c('zidane'));
    expect(m.ballNo).toBe(2);
    expect(m.turn).toBe(1);
    expect(m.starters).toEqual(['kane', 'zidane']);
  });

  it('three bibs and the match is over for two players', () => {
    let m = start(['Jonno', 'Dave']);
    for (let i = 0; i < 3; i++) {
      m = lost(m, { reason: 'forfeit', open: [] }, {});
      if (i < 2) m = dealt(nextBall(m), c(`s${i}`));
    }
    expect(m.players[0]!.bibs).toBe(3);
    expect(m.over).toBe(true);
    expect(winner(m)).toBe(1);
  });

  it('a player with three bibs leaves the rotation and the others carry on', () => {
    let m = start(['A', 'B', 'C']);
    // A loses three balls in a row.
    for (let i = 0; i < 3; i++) {
      m = lost(m, { reason: 'forfeit', open: [] }, {});
      m = dealt(nextBall(m), c(`s${i}`));
    }
    expect(m.over).toBe(false);
    expect(alive(m)).toEqual([1, 2]);
    // A is out, so B kicks off.
    expect(m.turn).toBe(1);
    m = passed(m, c('x'), [], [], {});
    expect(m.turn).toBe(2);
    m = passed(m, c('y'), [], [], {});
    // Skips A.
    expect(m.turn).toBe(1);
  });

  it('a rematch keeps the players and the clock and clears the bibs', () => {
    let m = start(['Jonno', 'Dave']);
    m = lost(m, { reason: 'forfeit', open: [] }, {});
    m = rematch(m);
    expect(m.players.map((p) => p.bibs)).toEqual([0, 0]);
    expect(m.clock).toBe(30);
    expect(m.over).toBe(false);
    expect(m.carrier).toBeNull();
    expect(m.starters).toEqual(['kane']);
  });
});
