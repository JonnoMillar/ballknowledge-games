/**
 * Tunnel's rules, pure. Five players, categories ordered easy to hard; each
 * category is a line from least to most. A category's values are frozen in
 * the schedule, so a later data refresh never changes a day already played.
 */
export const CATEGORIES = ['age', 'height', 'apps', 'goals', 'clubs'] as const;
export type Category = (typeof CATEGORIES)[number] | 'rating' | 'followers';
export type Finale = { kind: 'rating'; edition: string } | { kind: 'followers'; asOf: string } | { kind: 'both'; edition: string; asOf: string };
export function categoriesFor(finale?: Finale): readonly Category[] {
  const firstFour = CATEGORIES.slice(0, 4);
  return finale?.kind === 'both' ? [...firstFour, 'rating', 'followers'] : [...firstFour, finale?.kind ?? 'clubs'];
}
export const finaleLabel = (finale: Finale): string => finale.kind !== 'followers' ? `FIFA ${finale.edition}` : 'Instagram';

/**
 * One number per player per category, higher is further along the line.
 * Age is the birth date as days since 1970 negated, so the youngest is least.
 */
export type Values = Record<(typeof CATEGORIES)[number], number[]> & Partial<Record<'rating' | 'followers', number[]>>;

/** Five players in every line. */
export const SIZE = 5;

/**
 * The smallest step between neighbours in a category's true line, so nothing
 * hinges on a centimetre or a disputed appearance. Sources disagree on
 * heights by a couple of centimetres and on career totals by a few games.
 */
export function minGap(cat: Category, a: number, b: number): number {
  switch (cat) {
    case 'age': return 365;
    case 'height': return 3;
    case 'apps': return 10;
    case 'goals': return Math.max(5, Math.ceil(0.1 * Math.max(Math.abs(a), Math.abs(b))));
    case 'clubs': return 1;
    case 'rating': return 1;
    case 'followers': return Math.max(1000, Math.ceil(0.03 * Math.max(a, b)));
  }
}

/** Indexes of the players, least to most. */
export function trueOrder(values: readonly number[]): number[] {
  return values.map((_, i) => i).sort((a, b) => values[a]! - values[b]!);
}

/** True when the line has no ties and every neighbour is at least `minGap` apart. */
export function fair(cat: Category, values: readonly number[]): boolean {
  if (!values.every(Number.isFinite)) return false;
  const o = trueOrder(values);
  for (let i = 1; i < o.length; i++) {
    const a = values[o[i - 1]!]!;
    const b = values[o[i]!]!;
    if (b - a < minGap(cat, a, b)) return false;
  }
  return true;
}

/** Pairs two lines put the other way round (Kendall distance): 0 same, 10 reversed for five. */
export function discord(a: readonly number[], b: readonly number[]): number {
  const pos = new Map(b.map((p, i) => [p, i]));
  let n = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (pos.get(a[i]!)! > pos.get(a[j]!)!) n++;
  return n;
}

/**
 * How far apart two lines must be. The reveal leaves the five in the last
 * category's true line, so the next category must start a long way from its
 * answer: neither close to it nor its mirror (both would give it away).
 * Lines further apart in the day only need to differ by more than one swap,
 * either way round: requiring the full gap between every pair builds no day.
 */
export const APART = { min: 3, max: 7, loose: 2 } as const;
export const apart = (a: readonly number[], b: readonly number[], neighbours = true) => {
  const d = discord(a, b);
  const min = neighbours ? APART.min : APART.loose;
  return d >= min && d <= SIZE * (SIZE - 1) / 2 - min;
};

/** Pairs in the right order, of ten: the score for one line. */
export function pairsRight(guess: readonly number[], values: readonly number[]): number {
  return SIZE * (SIZE - 1) / 2 - discord(guess, trueOrder(values));
}
