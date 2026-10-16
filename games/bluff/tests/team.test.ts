import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sides from '../data/sides.json';
import { teamMark } from '../lib/team';

const teams = new Set((sides as { team: string; opponent: string }[]).flatMap((s) => [s.team, s.opponent]));

describe('team badges', () => {
  it('every team and opponent in the data has a crest or a flag', () => {
    expect([...teams].filter((n) => !teamMark(n))).toEqual([]);
  });

  it('every nation has its flag file', () => {
    const bad = [...teams].filter((n) => {
      const m = teamMark(n);
      return m?.kind === 'nation' && !existsSync(`public/flags/${m.id}.svg`);
    });
    expect(bad).toEqual([]);
  });
});
