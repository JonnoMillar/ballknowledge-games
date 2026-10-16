/**
 * Two squad players for a club-season, from career stints (data/careers.json).
 *
 * A stint gives years and total league apps, not seasons, so the roster is an
 * estimate. Infobox years include the half-season someone arrived or left in
 * and loans out, so a season strictly inside a stint is trusted first; the
 * edges are used only when fewer than two players are inside. Regulars only:
 * 20+ league apps a season on average. The top scorer is never a squad hint.
 */
export interface Stint { name: string; fame: number; from: number; to: number | null; apps: number | null }

const REGULAR = 20;
/** Below this, nobody will place the name. */
const KNOWN = 20;

/** "Andy King (footballer, born 1988)" to "Andy King". */
export const plainName = (title: string) => title.replace(/\s*\([^)]*\)\s*$/, '');

export function squadHints(stints: readonly Stint[], start: number, topScorers: readonly string[], now = new Date().getFullYear()): [string, string] | null {
  const regular = stints.filter((s) => {
    const to = s.to ?? now;
    return s.apps != null && s.apps / Math.max(1, to - s.from) >= REGULAR && s.fame >= KNOWN && !topScorers.includes(plainName(s.name));
  });
  const inside = regular.filter((s) => start > s.from && start + 1 < (s.to ?? now));
  const edge = regular.filter((s) => start >= s.from && start + 1 <= (s.to ?? now));
  const pool = (inside.length >= 2 ? inside : edge).sort((a, b) => b.fame - a.fame || a.name.localeCompare(b.name));
  const names = [...new Set(pool.map((s) => plainName(s.name)))];
  if (names.length < 2) return null;
  // Step 2 is a regular, not the star: from the middle of the list. Step 4 is the best known.
  const star = names[0]!;
  const regularName = names[Math.max(1, Math.floor(names.length / 2))]!;
  return [regularName, star];
}
