import { describe, expect, it } from 'vitest';
import sides from '../data/sides.json';
import { teamMark } from '../lib/team';
import { hasFlag } from '../../../components/ClueBadge';

describe('team badges', () => {
  it('every team and opponent in the data has a crest or a flag', () => {
    const names = new Set((sides as { team: string; opponent: string }[]).flatMap((s) => [s.team, s.opponent]));
    const missing = [...names].filter((n) => !teamMark(n));
    expect(missing).toEqual([]);
  });

  it('every nation has a drawn flag', () => {
    const names = new Set((sides as { team: string; opponent: string }[]).flatMap((s) => [s.team, s.opponent]));
    const bad = [...names].flatMap((n) => {
      const m = teamMark(n);
      return m?.kind === 'nation' && !hasFlag(m.id) ? [n] : [];
    });
    expect(bad).toEqual([]);
  });
});
