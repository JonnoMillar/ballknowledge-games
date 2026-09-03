import type { PositionClass } from '../lib/chemistry/types';
import type { SparqlBinding } from './sparql';

export interface RawSpell {
  clubId: string;
  leagueId: string;
  from: number | null;
  to: number | null;
}

export interface RawPlayer {
  id: string;
  name: string;
  aliases: string[];
  nation: string;
  sitelinks: number;
  positions: PositionClass[];
  clubs: RawSpell[];
}

const qid = (uri: string): string => uri.split('/').pop() ?? uri;
const year = (iso: string | undefined): number | null =>
  iso ? Number.parseInt(iso.slice(0, 4), 10) : null;

/**
 * P413 is coarse — Mbappe's whole record is one value. We map to GK/DEF/MID/FWD
 * and no finer, which is all spec 5.3 requires.
 */
const POSITION_CLASS: Record<string, PositionClass> = {
  Q201330: 'GK',    // goalkeeper
  Q2005335: 'DEF',  // defender
  Q17505298: 'DEF', // centre-back
  Q3341015: 'DEF',  // full-back
  Q193592: 'MID',   // midfielder
  Q1379556: 'MID',  // defensive midfielder
  Q1932482: 'MID',  // attacking midfielder
  Q280658: 'FWD',   // forward
  Q21057452: 'FWD', // winger
  Q1130256: 'FWD',  // striker
};

export function positionClassOf(positionQid: string): PositionClass | null {
  return POSITION_CLASS[positionQid] ?? null;
}

/** Collapse the row-per-spell SPARQL result into one record per player. */
export function normalise(
  bindings: readonly SparqlBinding[],
  clubToLeague: ReadonlyMap<string, string>,
): RawPlayer[] {
  const byId = new Map<string, RawPlayer>();

  for (const b of bindings) {
    const playerUri = b['player']?.value;
    const name = b['name']?.value;
    if (!playerUri || !name) continue;

    const id = qid(playerUri);
    let player = byId.get(id);
    if (!player) {
      player = {
        id, name, aliases: [],
        nation: b['nation'] ? qid(b['nation'].value) : 'UNKNOWN',
        sitelinks: Number.parseInt(b['sitelinks']?.value ?? '0', 10),
        positions: [], clubs: [],
      };
      byId.set(id, player);
    }

    const posUri = b['position']?.value;
    if (posUri) {
      const cls = positionClassOf(qid(posUri));
      if (cls && !player.positions.includes(cls)) player.positions.push(cls);
    }

    const clubUri = b['club']?.value;
    if (clubUri) {
      const clubId = qid(clubUri);
      const from = year(b['start']?.value);
      const already = player.clubs.some((c) => c.clubId === clubId && c.from === from);
      if (!already) {
        player.clubs.push({
          clubId,
          leagueId: clubToLeague.get(clubId) ?? `UNKNOWN_${clubId}`,
          from,
          to: year(b['end']?.value),
        });
      }
    }
  }

  return [...byId.values()];
}
