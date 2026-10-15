/**
 * The club's league top scorer, from a Wikipedia club-season infobox:
 * `| league_topscorer = <br>[[Luis Suárez (Uruguayan footballer)|Luis Suárez]] (31)`.
 * Ties list several names (`[[A]]<br>[[B]]<br>(6 each)`). Null when the
 * field is missing or has no tally.
 */
export interface TopScorer { names: string[]; goals: number }

export function topScorerField(wikitext: string): string | null {
  return wikitext.match(/\|\s*league[ _]top[ _]?scorer\s*=\s*([^\n]*)/i)?.[1]?.trim() || null;
}

export function parseTopScorer(field: string | null): TopScorer | null {
  if (!field) return null;
  const goals = field.match(/\((\d+)/)?.[1];
  // The link's target, not its label: the label is often a surname ("[[Iwan Roberts|Roberts]]").
  const names = [...field.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]!.replace(/\s*\([^)]*\)\s*$/, '').trim());
  if (!goals || names.length === 0) return null;
  return { names, goals: Number(goals) };
}
