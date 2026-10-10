import { distance, SPOT, type Spot } from './pitch';

/**
 * Pitch pin's scoring. Each goal scores 0 to 100 on its distance; a pack
 * scores the mean, rounded down, so packs of 6 and 9 compare; the pack
 * score lands on one fixed scale of five tiers. Rounding down keeps the
 * lazy pin (best pack 59.86) out of Sharp.
 */
export type Ring = 'bullseye' | 'inner' | 'outer' | 'miss';
export type Tier = 'wide' | 'close' | 'sharp' | 'deadly' | 'pinpoint';

/** The bullseye is 2 m: the two sources disagree by up to 3 m on one goal, so finer would reward noise. */
export function ring(d: number): Ring {
  return d <= 2 ? 'bullseye' : d <= 5 ? 'inner' : d <= 10 ? 'outer' : 'miss';
}

export function points(d: number): number {
  return d <= 2 ? 100 : Math.round(100 * Math.exp(-(d - 2) / 8));
}

export const RING_NAME: Record<Ring, string> = { bullseye: 'Bullseye', inner: 'Inner', outer: 'Outer', miss: 'Miss' };
export const MARK: Record<Ring, string> = { bullseye: '🎯', inner: '🟩', outer: '🟨', miss: '⬜' };

export function packScore(ds: readonly number[]): number {
  return Math.floor(ds.reduce((a, d) => a + points(d), 0) / ds.length);
}

/** The lazy pin: every goal pinned on the penalty spot. Fair packs keep it under 60. */
export function lazyScore(ats: readonly Spot[]): number {
  return packScore(ats.map((a) => distance(SPOT, a)));
}

/**
 * Lowest first. The floors were set on 31 real packs: the lazy pin is Wide
 * or Close, a decent fan (about 5 m a goal) Sharp, an expert Deadly and
 * Pinpoint about one pack in four.
 */
export const TIERS: readonly { tier: Tier; floor: number; name: string }[] = [
  { tier: 'wide', floor: 0, name: 'Wide' },
  { tier: 'close', floor: 40, name: 'Close' },
  { tier: 'sharp', floor: 60, name: 'Sharp' },
  { tier: 'deadly', floor: 75, name: 'Deadly' },
  { tier: 'pinpoint', floor: 90, name: 'Pinpoint' },
];
export const TIER_NAME = Object.fromEntries(TIERS.map((t) => [t.tier, t.name])) as Record<Tier, string>;

export function tier(score: number): Tier {
  return TIERS.filter((t) => score >= t.floor).at(-1)!.tier;
}

/** The tier above and how many points short, or null at the top. */
export function nextTier(score: number): { tier: Tier; gap: number } | null {
  const up = TIERS.find((t) => t.floor > score);
  return up ? { tier: up.tier, gap: up.floor - score } : null;
}

/** The share text: the pack, the score and its tier, one mark a goal. No names, no positions. */
export function shareText(title: string, ds: readonly number[]): string {
  const s = packScore(ds);
  return `Pitch pin · ${title}\n${s} ${TIER_NAME[tier(s)]}\n${ds.map((d) => MARK[ring(d)]).join('')}`;
}
