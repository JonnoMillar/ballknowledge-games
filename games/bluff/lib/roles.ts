/**
 * Where a player plays, finer than DEF/MID/FWD, so a planted mole fits the
 * slot it takes: a holding midfielder's slot gets someone who sits, never a
 * number 10 (Jonno, 2026-11-16: James Rodríguez in Casemiro's DM slot gave
 * the mole away). Roles come from two places: the Wikipedia infobox position
 * (games/bluff/data/roles.json, scripts/bluff/fetch-roles.ts) and every slot
 * the player started in across Odd Man Out's real XIs.
 */
export type Role = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'W' | 'CF';

/** A team-sheet slot's position code to the role it asks for. */
const SLOT_ROLE: Record<string, Role> = {
  GK: 'GK',
  CB: 'CB', SW: 'CB',
  LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', WB: 'FB',
  DM: 'DM', CDM: 'DM',
  CM: 'CM',
  AM: 'AM',
  LM: 'W', RM: 'W', LW: 'W', RW: 'W', LF: 'W', RF: 'W',
  CF: 'CF', ST: 'CF', SS: 'CF',
};
export const slotRole = (pos: string): Role | null => SLOT_ROLE[pos] ?? null;

/**
 * The roles a mole may have to take a slot. Neighbours only: a box-to-box
 * player can sit or push on, a winger can play off the striker, but nobody
 * crosses two lines (an attacking midfielder never holds; a striker never
 * plays wide midfield).
 */
export const FITS: Record<Role, readonly Role[]> = {
  GK: ['GK'],
  CB: ['CB'],
  FB: ['FB'],
  DM: ['DM', 'CM'],
  CM: ['CM', 'DM', 'AM'],
  AM: ['AM', 'CM', 'W'],
  W: ['W', 'AM'],
  CF: ['CF'],
};

/** Words in an infobox position, most specific first: the first that matches a part wins. */
const WORDS: readonly [RegExp, Role[]][] = [
  [/goal ?keeper|keeper/, ['GK']],
  [/centre[- ]?back|center[- ]?back|central defender|centre[- ]half|center[- ]half|sweeper|libero/, ['CB']],
  [/full[- ]?back|left[- ]?back|right[- ]?back|wing[- ]?back|lateral/, ['FB']],
  [/defensive midfield|holding midfield|anchor|volante|deep[- ]lying/, ['DM']],
  [/attacking midfield|playmaker|number 10|trequartista|advanced playmaker/, ['AM']],
  [/central midfield|centre midfield|center midfield|box[- ]to[- ]box|mezzala/, ['CM']],
  [/wide midfield|left midfield|right midfield|winger|wide forward|wide player/, ['W']],
  [/second striker|support striker|centre[- ]forward|center[- ]forward|striker|forward|attacker/, ['CF']],
  [/midfield/, ['CM']],
  [/defender|defence/, ['CB', 'FB']],
];

/** "Attacking midfielder, winger" to ['AM', 'W']. Unknown words give nothing. */
export function rolesOfText(text: string): Role[] {
  const out = new Set<Role>();
  for (const part of text.toLowerCase().split(/,|\/|;|\band\b|\bor\b|\(|\)/)) {
    const hit = WORDS.find(([re]) => re.test(part));
    if (hit) for (const r of hit[1]) out.add(r);
  }
  return [...out];
}
