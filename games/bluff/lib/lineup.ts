import type { PositionClass } from '../../../src/lib/chemistry/types';

/**
 * An XI as Wikipedia lists it (position codes, right to left within a line)
 * turned into lines on a pitch, back to front.
 *
 * Lines: 0 keeper, 1 back line, 2 holding, 3 middle, 4 attacking, 5 front.
 * Wingers sit with an attacking midfielder when there is one (4-2-3-1),
 * otherwise up front (4-3-3). Wing-backs sit in midfield behind a back three
 * (3-5-2), otherwise in the back line.
 */
const LINE: Record<string, number> = {
  GK: 0,
  RB: 1, CB: 1, LB: 1, SW: 1, RCB: 1, LCB: 1, DF: 1, FB: 1,
  DM: 2, CDM: 2,
  CM: 3, RM: 3, LM: 3, RCM: 3, LCM: 3, MF: 3,
  AM: 4, CAM: 4,
  CF: 5, ST: 5, FW: 5, RF: 5, LF: 5, SS: 5,
};
const WINGER = new Set(['RW', 'LW']);
const WINGBACK = new Set(['RWB', 'LWB', 'WB']);

export interface Listed<T> { pos: string; player: T }

/** Null when the XI is not one keeper and ten known positions. */
export function toLines<T>(xi: readonly Listed<T>[]): Listed<T>[][] | null {
  if (xi.length !== 11) return null;
  const codes = xi.map((p) => p.pos);
  if (codes.filter((c) => c === 'GK').length !== 1) return null;
  const hasAM = codes.some((c) => LINE[c] === 4);
  const backs = codes.filter((c) => LINE[c] === 1).length;
  const lines: Listed<T>[][] = [[], [], [], [], [], []];
  for (const p of xi) {
    let line = LINE[p.pos];
    if (WINGER.has(p.pos)) line = hasAM ? 4 : 5;
    if (WINGBACK.has(p.pos)) line = backs <= 3 ? 3 : 1;
    if (line === undefined) return null;
    lines[line]!.push(p);
  }
  // Wikipedia lists a line right to left; the pitch is drawn attacking up,
  // so the right-back is on the right of the screen. Lefts then rights
  // settle any line it listed out of order (Brazil 2002 had the wing-backs
  // ahead of the centre).
  return lines.filter((l) => l.length > 0).map((l) => [...l].reverse().sort((a, b) => side(a.pos) - side(b.pos)));
}

const side = (pos: string) => (pos.startsWith('L') ? 0 : pos.startsWith('R') ? 2 : 1);

/** "4-2-3-1": outfield lines, back to front. */
export const formation = (lines: readonly unknown[][]): string => lines.slice(1).map((l) => l.length).join('-');

/** Which pool positions could plausibly stand in a slot. */
export function bucketsFor(pos: string): PositionClass[] {
  if (pos === 'GK') return ['GK'];
  if (WINGER.has(pos)) return ['MID', 'FWD'];
  if (WINGBACK.has(pos)) return ['DEF', 'MID'];
  const line = LINE[pos];
  if (line === 1) return ['DEF'];
  if (line === 5) return ['FWD'];
  return ['MID'];
}
