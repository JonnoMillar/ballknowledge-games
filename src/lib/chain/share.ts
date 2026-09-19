/**
 * The share line: the shape of the attempt and none of the answer.
 *
 * A friend who has not played can still play. The links show how far the
 * chain held, and nothing says who was on it. There is no score to append:
 * the chain held or it did not, and that is the whole result.
 */
export function shareLine({ title, links }: { title: string; links: readonly boolean[] }): string {
  const grid = links.map((made) => (made ? '🟩' : '🟥')).join('');
  const made = links.filter(Boolean).length;
  const held = made === links.length;
  return `${title}\n${grid}${held ? '' : ` broken (${made}/${links.length})`}`;
}
