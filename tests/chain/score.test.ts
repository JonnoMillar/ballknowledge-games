import { describe, it, expect } from 'vitest';
import {
  chainLinks, chainProgress, chainFieldFor, chainSlotDepths, chainSlotObscurity,
  chainObscurity, isGreen, linked,
} from '../../src/lib/chain/score';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (
  id: string, nation: string, clubs: string[], fame: number, leagues = clubs.map((c) => `L_${c}`),
): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs, leagueIds: leagues,
  positions: ['MID'], fame: { value: fame, source: 'sitelinks' },
});

// a and c share nothing; b bridges them by club at both ends.
const a = mk('a', 'BRA', ['CITY'], 100);
const b = mk('b', 'JPN', ['CITY', 'ROMA'], 20);
const c = mk('c', 'ITA', ['ROMA'], 90);
// Also bridges a and c, but is far better known.
const famousBridge = mk('famousBridge', 'GER', ['CITY', 'ROMA'], 80);
// Shares only a nation with a — orange, not green.
const weak = mk('weak', 'BRA', ['FLA'], 30);
// Same club AND nation as a, so hyper.
const hyper = mk('hyper', 'BRA', ['CITY', 'ROMA'], 40);

const players = [a, b, c, famousBridge, weak, hyper];
const pool = new Map(players.map((p) => [p.id, p]));

describe('isGreen', () => {
  it('accepts green and hyper, rejects the rest', () => {
    expect(isGreen('green')).toBe(true);
    expect(isGreen('hyper')).toBe(true);
    expect(isGreen('orange')).toBe(false);
    expect(isGreen('red')).toBe(false);
    expect(isGreen(null)).toBe(false);
  });
});

describe('chainLinks', () => {
  it('produces one link per adjacent pair', () => {
    expect(chainLinks(['a', 'b', 'c'], pool)).toHaveLength(2);
  });

  it('leaves a link colourless while either end is empty', () => {
    const links = chainLinks(['a', null, 'c'], pool);
    expect(links[0]!.colour).toBeNull();
    expect(links[1]!.colour).toBeNull();
  });

  it('reads the colour actually achieved', () => {
    const links = chainLinks(['a', 'hyper', 'c'], pool);
    expect(links[0]!.colour).toBe('hyper');
    expect(links[1]!.colour).toBe('green');
  });
});

describe('chainProgress', () => {
  it('is solved only when every link is green or better', () => {
    expect(chainProgress(chainLinks(['a', 'b', 'c'], pool)).solved).toBe(true);
    expect(chainProgress(chainLinks(['a', 'hyper', 'c'], pool)).solved).toBe(true);
  });

  it('an orange link does not count', () => {
    const p = chainProgress(chainLinks(['a', 'weak', 'c'], pool));
    expect(p.made).toBe(0);
    expect(p.solved).toBe(false);
  });

  it('an empty chain is not solved', () => {
    expect(chainProgress(chainLinks([null, null], pool)).solved).toBe(false);
  });
});

describe('chainFieldFor', () => {
  it('is the whole pool while both neighbours are empty', () => {
    expect(chainFieldFor(1, [null, null, null], players, pool)).toHaveLength(players.length);
  });

  it('is only players green to every placed neighbour', () => {
    const field = chainFieldFor(1, ['a', null, 'c'], players, pool).map((p) => p.id);
    expect(field.sort()).toEqual(['b', 'famousBridge', 'hyper']);
  });

  it('excludes players used elsewhere in the chain but keeps its own occupant', () => {
    const field = chainFieldFor(1, ['a', 'b', 'c'], players, pool).map((p) => p.id);
    expect(field).toContain('b');
    expect(field).not.toContain('a');
    expect(field).not.toContain('c');
  });
});

describe('chainSlotObscurity', () => {
  const given = ['a', null, 'c'];

  it('scores only the slots the player filled', () => {
    const per = chainSlotObscurity(['a', 'b', 'c'], given, players, pool);
    expect(Object.keys(per)).toEqual(['1']);
  });

  it('rewards the more obscure of two valid bridges', () => {
    const obscure = chainSlotObscurity(['a', 'b', 'c'], given, players, pool)[1]!;
    const famous = chainSlotObscurity(['a', 'famousBridge', 'c'], given, players, pool)[1]!;
    expect(obscure).toBeGreaterThan(famous);
  });

  it('scores an illegal pick at zero, because it is not in its own field', () => {
    // `weak` links orange to a, so it never belonged to that slot's answer set.
    expect(chainSlotObscurity(['a', 'weak', 'c'], given, players, pool)[1]).toBe(0);
  });
});

describe('chainObscurity', () => {
  it('is zero for an untouched chain rather than a result', () => {
    expect(chainObscurity({})).toBe(0);
  });

  it('averages the filled slots', () => {
    expect(chainObscurity({ 1: 80, 3: 40 })).toBe(60);
  });
});

describe('chainSlotDepths', () => {
  const given = ['a', null, 'c'];

  it('reports the size of the field the pick was made from', () => {
    // b, famousBridge and hyper all bridge a and c.
    expect(chainSlotDepths(['a', 'b', 'c'], given, players, pool)[1]!.fieldSize).toBe(3);
  });

  it('ranks the most obscure answer first', () => {
    // b is fame 20, hyper 40, famousBridge 80.
    expect(chainSlotDepths(['a', 'b', 'c'], given, players, pool)[1]!.rank).toBe(1);
    expect(chainSlotDepths(['a', 'hyper', 'c'], given, players, pool)[1]!.rank).toBe(2);
    expect(chainSlotDepths(['a', 'famousBridge', 'c'], given, players, pool)[1]!.rank).toBe(3);
  });

  it('gives a pick that does not link no rank at all', () => {
    // Rank 0 would read as "best possible"; there is no rank to report.
    expect(chainSlotDepths(['a', 'weak', 'c'], given, players, pool)[1]!.rank).toBeNull();
  });

  it('leaves given slots unscored', () => {
    expect(Object.keys(chainSlotDepths(['a', 'b', 'c'], given, players, pool))).toEqual(['1']);
  });
});

describe('club mode', () => {
  // `natLeague` shares no club with `a`, but the same nation AND league — a
  // real green link under the chemistry rule and nothing at all under clubs.
  const natLeague = mk('natLeague', 'BRA', ['FLA'], 30, ['L_CITY']);
  const clubPlayers = [...players, natLeague];
  const clubPool = new Map(clubPlayers.map((p) => [p.id, p]));

  it('the two rules disagree exactly where they should', () => {
    expect(linked(a, natLeague, 'chemistry')).toBe(true);
    expect(linked(a, natLeague, 'clubs')).toBe(false);
    expect(linked(a, b, 'clubs')).toBe(true);
  });

  it('a nation-plus-league bridge does not complete a club chain', () => {
    const links = chainLinks(['a', 'natLeague', 'a'], clubPool, 'clubs');
    expect(chainProgress(links).solved).toBe(false);
    expect(links[0]!.clubs).toEqual([]);
  });

  it('a made club link carries the club that made it', () => {
    const links = chainLinks(['a', 'b', 'c'], clubPool, 'clubs');
    expect(links[0]!.made).toBe(true);
    expect(links[0]!.clubs).toEqual(['CITY']);
    expect(links[1]!.clubs).toEqual(['ROMA']);
  });

  it('narrows the field to players who share a club', () => {
    // Scored against `a` alone: a player cannot hold two nations, so a
    // nation-plus-league bridge to BOTH neighbours of a mixed-nation chain is
    // impossible by construction and would test nothing.
    const chem = chainFieldFor(1, ['a', null, null], clubPlayers, clubPool, 'chemistry').map((p) => p.id);
    const club = chainFieldFor(1, ['a', null, null], clubPlayers, clubPool, 'clubs').map((p) => p.id);
    expect(chem).toContain('natLeague');
    expect(club).not.toContain('natLeague');
    expect(club.sort()).toEqual(['b', 'famousBridge', 'hyper']);
  });
});
