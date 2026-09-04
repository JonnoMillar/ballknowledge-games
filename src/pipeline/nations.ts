/**
 * Nation QID -> ISO 3166-1 alpha-2, for flag rendering.
 *
 * Returns null rather than guessing: an unmapped nation renders no flag, which
 * is correct. A wrong flag on a player card is worse than none.
 */
export function isoForNation(
  nationQid: string,
  map: Readonly<Record<string, string>>,
): string | null {
  const iso = map[nationQid];
  return iso ? iso.toLowerCase() : null;
}
