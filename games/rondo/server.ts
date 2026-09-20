import { clubColour, signatureClub } from '../../src/lib/club-colours';
import { clubView, type ClubView } from '../../src/lib/clubs';
import { buildClubIndex, judgePass, type Ball, type ClubIndex } from './lib/rules';
import type { Carrier } from './lib/match';
import type { PassResponse } from './lib/wire';
import type { Player } from '../../src/lib/chemistry/types';
import { loadData } from '../../src/server/board';

/**
 * Rondo's referee.
 *
 * The pool and the club index stay here. The page sends the ball and a
 * name; this judges it and sends back the verdict, the clubs it went
 * through, and on a loss the clubs that were open. A held pass says
 * nothing about the new carrier's other clubs: the next player still has
 * to know the career.
 */

/**
 * Leagues the audience follows. A starter needs two of them, so a player
 * famous on wikis nobody here reads (the sitelink count is global) does not
 * open a ball. The same list the daily generator uses for its givens.
 */
const KNOWN_LEAGUES = new Set(['Q9448', 'Q19510', 'Q19565', 'Q15804', 'Q324867', 'Q82595', 'Q13394', 'Q167541', 'Q182994', 'Q14377162', 'Q485568']);
/** Managers whose playing careers are not what anyone knows them for. */
const NOT_A_STARTER = new Set(['Q4462']); // Joachim Löw
const STARTER_FAME = 60;
/** A club needs this many others on it before it counts as a way out of a starter. */
const SHELF = 6;

interface Ref {
  byId: Map<string, Player>;
  byClub: ClubIndex;
  starters: Player[];
  clubs: Record<string, { name: string; crest?: string; crestUrl?: string }>;
}

let ref: Promise<Ref> | null = null;

function loadRef(): Promise<Ref> {
  ref ??= (async () => {
    const { players, byId, clubs } = await loadData();
    const byClub = buildClubIndex(players);
    const shelf = (c: string) => (byClub.get(c)?.length ?? 0) - 1;
    const starters = players.filter((p) =>
      p.fame.value >= STARTER_FAME
      && !NOT_A_STARTER.has(p.id)
      && p.clubIds.length >= 3
      && p.leagueIds.filter((l) => KNOWN_LEAGUES.has(l)).length >= 2
      && p.clubIds.filter((c) => shelf(c) >= SHELF).length >= 2);
    return { byId, byClub, starters, clubs };
  })();
  return ref;
}

async function carrierOf(p: Player): Promise<Carrier> {
  const { images } = await loadData();
  const image = images[p.id];
  return { id: p.id, name: p.name, ground: clubColour(signatureClub(p)), ...(image ? { image } : {}) };
}

/** A starter not in `exclude`, at random. Wraps to the whole set if everyone is excluded. */
export async function deal(exclude: readonly string[]): Promise<Carrier> {
  const { starters } = await loadRef();
  const gone = new Set(exclude);
  const fresh = starters.filter((p) => !gone.has(p.id));
  const from = fresh.length > 0 ? fresh : starters;
  const p = from[Math.floor(Math.random() * from.length)]!;
  return carrierOf(p);
}

export async function judge(ball: Ball, target: string | null): Promise<PassResponse> {
  const { byId, byClub, clubs: stored } = await loadRef();
  const verdict = judgePass(byId, byClub, ball, target);
  const views = (ids: readonly string[]): Record<string, ClubView> => {
    const out: Record<string, ClubView> = {};
    for (const id of ids) out[id] = stored[id] ? clubView(stored[id]!) : { name: id };
    return out;
  };
  if (verdict.ok) {
    const to = byId.get(target!)!;
    return { ok: true, via: verdict.via, burnt: verdict.burnt, carrier: await carrierOf(to), clubs: views(verdict.via) };
  }
  const to = target ? byId.get(target) : undefined;
  return {
    ok: false,
    reason: verdict.reason,
    open: verdict.open,
    ...(verdict.via ? { via: verdict.via } : {}),
    ...(to ? { target: await carrierOf(to) } : {}),
    clubs: views([...verdict.open, ...(verdict.via ?? [])]),
  };
}

/** The number of starters the deal can draw from, for the page's blurb. */
export async function starterCount(): Promise<number> {
  return (await loadRef()).starters.length;
}
