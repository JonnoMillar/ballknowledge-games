/**
 * What happened at one plate, as the share line and the album record it:
 * held, held with a hint, or not held.
 */
export type PlateMark = 'held' | 'hinted' | 'missed';

export const MARK_GLYPH: Record<PlateMark, string> = { held: '🟩', hinted: '🟨', missed: '🟥' };

/**
 * The share line: the shape of the attempt and none of the answer.
 *
 * A friend who has not played can still play. One glyph per plate says
 * whether it held, and yellow says it held with the clubs shown; nothing
 * says who was on it. There is no score to append: the chain held or it
 * did not, and that is the whole result.
 */
export function shareLine({ title, plates }: { title: string; plates: readonly PlateMark[] }): string {
  const grid = plates.map((m) => MARK_GLYPH[m]).join('');
  const held = plates.filter((m) => m !== 'missed').length;
  const all = held === plates.length;
  return `${title}\n${grid}${all ? '' : ` broken (${held}/${plates.length})`}`;
}

/** One mark per plate, from the seal's verdict and the hints taken. */
export function plateMarks(slots: readonly { index: number; held: boolean }[], hinted: readonly number[]): PlateMark[] {
  return slots.map((s) => (!s.held ? 'missed' : hinted.includes(s.index) ? 'hinted' : 'held'));
}
