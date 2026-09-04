import type { PositionClass } from '../lib/chemistry/types';
import { applyNameOverride } from './overrides';
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
/**
 * EVERY QID BELOW WAS RESOLVED AGAINST THE LIVE ENDPOINT ON 2026-09-03.
 * Do not add one from memory.
 *
 * An earlier version of this map was written from memory and was wrong for
 * seven of ten entries — "defender" pointed at Cyphon hofferi (a beetle),
 * "attacking midfielder" at a starfish, "striker" at a drug. The result was a
 * plausible-looking pipeline that silently discarded 42% of all players for
 * having no recognisable position.
 */
const POSITION_CLASS: Record<string, PositionClass> = {
  // goalkeeper — two distinct live items, both in use
  Q201330: 'GK',
  Q179789: 'GK',

  Q336286: 'DEF',    // defender
  Q268258: 'DEF',    // centre-back
  Q90173132: 'DEF',  // full-back
  Q107213256: 'DEF', // wing-back
  Q1489923: 'DEF',   // sweeper

  Q193592: 'MID',    // midfielder
  Q6008848: 'MID',   // central midfielder
  Q18691898: 'MID',  // defensive midfielder
  Q90326494: 'MID',  // attacking midfielder
  Q114358123: 'MID', // right midfielder
  Q8025128: 'MID',   // wing half (historic, broadly a midfield role)

  Q280658: 'FWD',    // forward
  Q9731197: 'FWD',   // centre-forward
  Q11681748: 'FWD',  // winger
  Q1369558: 'FWD',   // winger
  Q2827965: 'FWD',   // winger
  Q114358150: 'FWD', // right winger
  Q114358158: 'FWD', // left winger
  Q3446915: 'FWD',   // attacker
  Q6037916: 'FWD',   // inside forward
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
        id, name: applyNameOverride(id, name), aliases: [],
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
