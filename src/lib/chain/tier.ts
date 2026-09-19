import type { SlotDepth } from './score';

/**
 * How deep a pick went, as a word a fan would use.
 *
 * The 0–100 obscurity score was a fact stated without a floor: "15th most
 * obscure of 16" is true of a perfectly good answer and reads as a loss. A
 * tier keeps the same rank and says it the way a pub would. The banker is
 * the safe pick you would stake the round on; nobody feels bad about a
 * banker, they feel seen. A deep cut is the one nobody else in the room
 * had. Depth is a bonus on top of a held chain, never a subtraction from it.
 */
export type Tier = 'deep' | 'shout' | 'banker';

export interface DepthRead {
  tier: Tier;
  /** How many of the field this pick was deeper than. */
  deeperThan: number;
  fieldSize: number;
  /** The share glyph. */
  glyph: string;
}

export const TIER_LABEL: Record<Tier, string> = {
  deep: 'Deep cut',
  shout: 'Good shout',
  banker: 'Banker',
};

const GLYPH: Record<Tier, string> = { deep: '💎', shout: '🔷', banker: '⚪' };

/** Rank 1 is the deepest. The thresholds are on the share of the field beaten. */
export function tierFor(rank: number, fieldSize: number): Tier {
  // The only way in is a deep cut by definition: there was no easier one.
  if (fieldSize <= 1) return 'deep';
  const beaten = (fieldSize - rank) / (fieldSize - 1);
  if (beaten >= 0.75) return 'deep';
  if (beaten >= 0.4) return 'shout';
  return 'banker';
}

/** Null for a pick that did not link: there is nothing to rate. */
export function depthRead(depth: SlotDepth | null): DepthRead | null {
  if (!depth || depth.rank === null) return null;
  const tier = tierFor(depth.rank, depth.fieldSize);
  return { tier, deeperThan: depth.fieldSize - depth.rank, fieldSize: depth.fieldSize, glyph: GLYPH[tier] };
}

/**
 * The share line: the shape of the attempt and none of the answer.
 *
 * A friend who has not played can still play. The links show how well the
 * chain held, and on a scored board the gems show how deep it went, and
 * neither says who was on it.
 */
export function shareLine(
  { title, links, tiers }: { title: string; links: readonly boolean[]; tiers: readonly (Tier | null)[] },
): string {
  const grid = links.map((made) => (made ? '🟩' : '🟥')).join('');
  const made = links.filter(Boolean).length;
  const held = made === links.length;
  const gems = held && tiers.length > 0 && tiers.every((t) => t !== null)
    ? ' ' + tiers.map((t) => GLYPH[t!]).join('')
    : '';
  const verdict = held ? '' : ` broken (${made}/${links.length})`;
  return `${title}\n${grid}${gems}${verdict}`;
}
