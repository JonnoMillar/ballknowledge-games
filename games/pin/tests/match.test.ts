import { describe, expect, it } from 'vitest';
import {
  fixturesFor, goalFor, nameScore, normalise, sameClub, scoreAfter, type FixtureLike, type ShotLike,
} from '../lib/match';

const fx = (id: string, h: string, a: string, datetime: string, isResult = true): FixtureLike =>
  ({ id, isResult, datetime, h: { title: h }, a: { title: a } });
const shot = (id: string, player: string, minute: number, h_a: 'h' | 'a', result = 'Goal', situation = 'OpenPlay'): ShotLike =>
  ({ id, player, minute: String(minute), h_a, result, situation });

describe('names', () => {
  it('normalises accents, case and punctuation', () => {
    expect(normalise('Emiliano Buendía')).toBe('emiliano buendia');
    expect(normalise('Brighton & Hove Albion')).toBe('brighton hove albion');
    expect(normalise("Nott'm Forest")).toBe('nott m forest');
  });
  it('matches a club when every word of Understat’s title is there', () => {
    expect(sameClub('Tottenham', 'tottenham hotspur')).toBe(true);
    expect(sameClub('Brighton', 'Brighton & Hove Albion')).toBe(true);
    expect(sameClub('West Ham', 'West Ham United')).toBe(true);
    expect(sameClub('Manchester City', 'manchester united')).toBe(false);
    expect(sameClub('Coventry', 'Bournemouth')).toBe(false);
  });
  it('scores how well two names for a player agree', () => {
    expect(nameScore('Emiliano Buendia', 'Emiliano Buendía')).toBe(3);
    expect(nameScore('Bruno Guimaraes', 'Bruno Guimarães')).toBe(3);
    expect(nameScore('Rodrigo Muniz', 'Muniz')).toBe(2);
    expect(nameScore('Son Heung-min', 'Heung-Min Son')).toBe(1);
    expect(nameScore('Rodri', 'Rodrigo Hernández')).toBe(0);
  });
});

describe('the score after each goal', () => {
  it('counts an own goal for the other side', () => {
    const { after, final } = scoreAfter([shot('2', 'B', 20, 'h', 'OwnGoal'), shot('1', 'A', 10, 'h'), shot('3', 'C', 30, 'a', 'MissedShots')]);
    expect(after.get('1')).toEqual([1, 0]);
    expect(after.get('2')).toEqual([1, 1]);
    expect(after.has('3')).toBe(false);
    expect(final).toEqual([1, 1]);
  });
});

describe('finding the fixture', () => {
  const league = [
    fx('1', 'Tottenham', 'Aston Villa', '2026-09-27 14:00:00'),
    fx('2', 'Aston Villa', 'Tottenham', '2027-02-01 14:00:00'),
    fx('3', 'Coventry', 'Brighton', '2026-09-13 14:00:00'),
    fx('4', 'Arsenal', 'Leeds', '2026-10-10 11:30:00', false),
  ];
  it('takes the clubs in either order, within the month', () => {
    expect(fixturesFor({ player: 'x', clubs: ['tottenham hotspur', 'aston villa'], when: '2026-09' }, league).map((f) => f.id)).toEqual(['1']);
  });
  it('takes a date give or take a day', () => {
    expect(fixturesFor({ player: 'x', clubs: ['Brighton & Hove Albion', 'Coventry City'], when: '2026-09-14' }, league).map((f) => f.id)).toEqual(['3']);
    expect(fixturesFor({ player: 'x', clubs: ['Brighton & Hove Albion', 'Coventry City'], when: '2026-09-16' }, league)).toEqual([]);
  });
  it('skips fixtures not played yet', () => {
    expect(fixturesFor({ player: 'x', clubs: ['arsenal', 'leeds united'], when: '2026-10' }, league)).toEqual([]);
  });
});

describe('finding the goal', () => {
  const coventryBrighton = fx('3', 'Coventry', 'Brighton', '2026-09-13 14:00:00');
  const pick = { player: 'Lewis Dunk', clubs: ['Brighton & Hove Albion', 'Coventry City'] as [string, string], when: '2026-09-13' };
  it('takes the one goal the pick names', () => {
    const shots = [shot('1', 'Lewis Dunk', 82, 'a'), shot('2', 'Danny Welbeck', 10, 'a')];
    expect(goalFor(pick, coventryBrighton, shots)?.id).toBe('1');
  });
  it('never takes a penalty', () => {
    expect(goalFor(pick, coventryBrighton, [shot('1', 'Lewis Dunk', 82, 'a', 'Goal', 'Penalty')])).toBeNull();
  });
  it('gives up on a brace when there is no score to tell them apart', () => {
    expect(goalFor(pick, coventryBrighton, [shot('1', 'Lewis Dunk', 20, 'a'), shot('2', 'Lewis Dunk', 82, 'a')])).toBeNull();
  });
  it('tells a brace apart by the score after the goal, scorer’s side first', () => {
    // Brighton are away: 0–1 after shot 1, 1–1 after shot 3, 1–2 after shot 2.
    const shots = [shot('1', 'Lewis Dunk', 20, 'a'), shot('3', 'Someone Else', 50, 'h'), shot('2', 'Lewis Dunk', 82, 'a')];
    expect(goalFor({ ...pick, score: [2, 1] }, coventryBrighton, shots)?.id).toBe('2');
    expect(goalFor({ ...pick, score: [1, 0] }, coventryBrighton, shots)?.id).toBe('1');
  });
});
