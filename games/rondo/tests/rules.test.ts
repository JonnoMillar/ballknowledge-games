import { describe, it, expect } from 'vitest';
import { buildClubIndex, judgePass, openClubs, receivable } from '../lib/rules';
import type { RondoFacts } from '../lib/rules';

const mk = (id: string, clubs: string[]): RondoFacts => ({ id, name: id, clubIds: clubs });

// A small album. BARCA and BAYERN are the big clubs; ORIENT is a shelf of one.
const kane = mk('kane', ['SPURS', 'BAYERN', 'LEICESTER', 'ORIENT']);
const bale = mk('bale', ['SPURS', 'MADRID']);
const lewa = mk('lewa', ['BAYERN', 'DORTMUND', 'BARCA']);
const messi = mk('messi', ['BARCA', 'PSG']);
const vardy = mk('vardy', ['LEICESTER', 'FLEETWOOD']);
const oneClub = mk('oneClub', ['MADRID']);
const mbappe = mk('mbappe', ['PSG', 'MADRID']);
const players = [kane, bale, lewa, messi, vardy, oneClub, mbappe];
const byId = new Map(players.map((p) => [p.id, p]));
const byClub = buildClubIndex(players);

describe('openClubs', () => {
  it('is the carrier\'s clubs less the burnt ones', () => {
    expect(openClubs(kane, ['SPURS'])).toEqual(['BAYERN', 'LEICESTER', 'ORIENT']);
    expect(openClubs(kane, [])).toEqual(kane.clubIds);
  });
});

describe('receivable', () => {
  it('is true when someone unnamed shares an open club', () => {
    expect(receivable(byClub, kane, ['SPURS'], ['bale', 'kane'])).toBe(true);
  });
  it('is false when every open club is empty or everyone on it has been named', () => {
    // Only Orient and Leicester open; Vardy is the only Leicester man and he is named.
    expect(receivable(byClub, kane, ['SPURS', 'BAYERN'], ['bale', 'kane', 'vardy'])).toBe(false);
  });
  it('is false for a one-club man whose club has just burnt', () => {
    expect(receivable(byClub, oneClub, ['MADRID'], ['bale', 'oneClub'])).toBe(false);
  });
});

describe('judgePass', () => {
  const ball = { carrier: 'bale', burnt: [], named: ['bale'] };

  it('holds a pass through a shared open club, burning it', () => {
    const v = judgePass(byId, byClub, ball, 'kane');
    expect(v).toEqual({ ok: true, via: ['SPURS'], burnt: ['SPURS'] });
  });

  it('burns every shared open club at once', () => {
    const v = judgePass(byId, byClub, { carrier: 'lewa', burnt: [], named: ['lewa'] }, 'messi');
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.burnt).toEqual(['BARCA']);
  });

  it('rejects a pass with no shared open club, and says what was open', () => {
    const v = judgePass(byId, byClub, ball, 'messi');
    expect(v).toEqual({ ok: false, reason: 'no-link', open: ['SPURS', 'MADRID'] });
  });

  it('rejects a pass through a club that has burnt', () => {
    const v = judgePass(byId, byClub, { carrier: 'kane', burnt: ['SPURS'], named: ['bale', 'kane'] }, 'bale');
    // Bale is already named, which is checked first.
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('repeat');
    const fresh = mk('fresh', ['SPURS']);
    const byId2 = new Map([...byId, ['fresh', fresh]]);
    const v2 = judgePass(byId2, buildClubIndex([...players, fresh]), { carrier: 'kane', burnt: ['SPURS'], named: ['bale', 'kane'] }, 'fresh');
    expect(v2).toEqual({ ok: false, reason: 'no-link', open: ['BAYERN', 'LEICESTER', 'ORIENT'] });
  });

  it('rejects a player already named this ball', () => {
    const v = judgePass(byId, byClub, { carrier: 'kane', burnt: ['SPURS'], named: ['bale', 'kane'] }, 'bale');
    expect(v).toEqual({ ok: false, reason: 'repeat', open: ['BAYERN', 'LEICESTER', 'ORIENT'] });
  });

  it('rejects an unknown id', () => {
    const v = judgePass(byId, byClub, ball, 'nobody');
    expect(v).toEqual({ ok: false, reason: 'unknown', open: ['SPURS', 'MADRID'] });
  });

  it('calls a pass nobody could take on a dead end, naming the club it went through', () => {
    // Bale -> the one-club man via Madrid. Madrid burns; he has nothing left.
    const v = judgePass(byId, byClub, ball, 'oneClub');
    expect(v).toEqual({ ok: false, reason: 'dead-end', via: ['MADRID'], open: ['SPURS', 'MADRID'] });
  });

  it('is a dead end when the only shelf left is people already named', () => {
    // Kane, Spurs and Bayern burnt -> Vardy via Leicester. Vardy's Fleetwood has nobody else.
    const v = judgePass(byId, byClub, { carrier: 'kane', burnt: ['SPURS', 'BAYERN'], named: ['bale', 'kane', 'lewa'] }, 'vardy');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('dead-end');
  });

  it('a forfeit says what was open', () => {
    const v = judgePass(byId, byClub, ball, null);
    expect(v).toEqual({ ok: false, reason: 'forfeit', open: ['SPURS', 'MADRID'] });
  });
});
