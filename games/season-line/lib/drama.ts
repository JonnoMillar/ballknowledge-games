/**
 * Which club-seasons make a line a fan can read. A flat mid-table line is
 * unguessable, so a board needs a story: a title (won late, or by a club that
 * never wins), a title thrown away, a fall from the top, a great escape, a
 * drop, a surge, or a season far from the club's usual place.
 * Pure: positions in, stories and a score out.
 */
export type Story = 'title' | 'race' | 'chase' | 'collapse' | 'escape' | 'drop' | 'surge' | 'boom' | 'slump';

export interface Drama { stories: Story[]; score: number }

/** The first games are noise: everyone is 1st or 20th after a weekend. */
const SETTLE = 6;
/** How far from the club's usual finish counts as a boom or a slump. */
const OFF_USUAL = 6;

const WEIGHT: Record<Story, number> = { title: 2, race: 1.5, chase: 2.5, collapse: 2, escape: 2.5, drop: 1.5, surge: 2, boom: 2.5, slump: 2 };

/**
 * `usual`: the club's median final position over its PL seasons, or null
 * when it has too few for a usual.
 */
export function drama(pos: readonly number[], teams: number, usual: number | null): Drama {
  const n = pos.length;
  const settled = pos.slice(SETTLE);
  const final = pos[n - 1]!;
  const lastTen = pos.slice(n - 10);
  const relegated = final > teams - 3;
  const bestEarly = Math.min(...pos.slice(SETTLE, n - 10));

  const stories: Story[] = [];
  if (final === 1) stories.push('title');
  // Won it with a race on: not top for some of the last ten.
  if (final === 1 && lastTen.some((p) => p > 1)) stories.push('race');
  // Top for a while, not champions.
  if (final > 1 && settled.filter((p) => p === 1).length >= 4) stories.push('chase');
  // In the top four, finished in the bottom half.
  if (bestEarly <= 4 && final > teams / 2 && !relegated) stories.push('collapse');
  // Long in the bottom three after the first ten games, stayed up.
  if (pos.slice(10).filter((p) => p > teams - 3).length >= 6 && !relegated) stories.push('escape');
  // Went down from the top half.
  if (relegated && bestEarly <= teams / 2) stories.push('drop');
  // From the bottom half after ten games to the top six.
  if (pos[9]! > teams / 2 && final <= 6) stories.push('surge');
  if (usual !== null && final <= usual - OFF_USUAL) stories.push('boom');
  if (usual !== null && final >= usual + OFF_USUAL) stories.push('slump');

  const settledRange = Math.max(...settled) - Math.min(...settled);
  const score = stories.reduce((s, x) => s + WEIGHT[x], 0) + (settledRange / teams) * 2;
  return { stories, score: Math.round(score * 100) / 100 };
}
