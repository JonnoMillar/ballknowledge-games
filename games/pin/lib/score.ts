import { distance, SPOT, type Spot } from './pitch';

/**
 * Pitch pin's scoring, both ways, so they can be compared. Distances are
 * stored once; metres and points are two readings of them.
 */
export type Ring = 'bullseye' | 'inner' | 'outer' | 'miss';
export type Mode = 'metres' | 'points';
export interface Tally { metres: number; points: number }

/** The bullseye is 2 m: the two sources disagree by up to 3 m on one goal, so finer would reward noise. */
export function ring(d: number): Ring {
  return d <= 2 ? 'bullseye' : d <= 5 ? 'inner' : d <= 10 ? 'outer' : 'miss';
}

export function points(d: number): number {
  return d <= 2 ? 100 : Math.round(100 * Math.exp(-(d - 2) / 8));
}

export const RING_NAME: Record<Ring, string> = { bullseye: 'Bullseye', inner: 'Inner', outer: 'Outer', miss: 'Miss' };
export const MARK: Record<Ring, string> = { bullseye: '🎯', inner: '🟩', outer: '🟨', miss: '⬜' };

export function tally(ds: readonly number[]): Tally {
  return {
    metres: Math.round(ds.reduce((a, d) => a + d, 0) * 10) / 10,
    points: ds.reduce((a, d) => a + points(d), 0),
  };
}

/** Par: what the lazy pin scores, every goal pinned on the penalty spot. */
export function par(ats: readonly Spot[]): Tally {
  return tally(ats.map((a) => distance(SPOT, a)));
}

/** Metres against par, lower is better: "26 under", "2 over", "level". */
export function againstPar(mine: number, parMetres: number): string {
  const diff = Math.round(parMetres - mine);
  return diff === 0 ? 'level' : diff > 0 ? `${diff} under` : `${-diff} over`;
}

/** The share text: the board, the score against par, one mark a goal. No names, no positions. */
export function shareText(title: string, ds: readonly number[], parT: Tally, mode: Mode): string {
  const t = tally(ds);
  const score = mode === 'points'
    ? `${t.points} / ${ds.length * 100}, par ${parT.points}`
    : `${t.metres.toFixed(1)} m, par ${Math.round(parT.metres)} (${againstPar(t.metres, parT.metres)})`;
  return `Pitch pin ${title}\n${score}\n${ds.map((d) => MARK[ring(d)]).join('')}`;
}
