import type { Player } from '../lib/chemistry/types';
import { clubView } from '../lib/clubs';
import { DECK, PITCH_KINDS, type PitchKind } from '../lib/slugger/deck';
import { basesFor, stintFame } from '../lib/slugger/grade';
import type { ClubRef, Pitch, Verdict } from '../lib/slugger/match';
import { loadData } from './board';

/**
 * The umpire's side of Slugger.
 *
 * The pool is read once (see board.ts) and indexed by club once. Nothing
 * that lists a club's players ever leaves this module: the deal returns
 * three clubs, the swing returns one ruling.
 */
interface Index {
  byId: Map<string, Player>;
  byClub: Map<string, Player[]>;
  club: (id: string) => ClubRef;
  deck: Record<PitchKind, string[]>;
}

let index: Promise<Index> | null = null;

function loadIndex(): Promise<Index> {
  index ??= (async () => {
    const { players, byId, clubs } = await loadData();
    const byClub = new Map<string, Player[]>();
    for (const p of players) {
      for (const c of p.clubIds) {
        let list = byClub.get(c);
        if (!list) byClub.set(c, (list = []));
        list.push(p);
      }
    }
    const club = (id: string): ClubRef => {
      const rec = clubs[id];
      const view = rec ? clubView(rec) : { name: id };
      return { id, name: view.name, crest: view.crest === true };
    };
    // A deck entry the pool does not know is dropped rather than pitched.
    const deck = Object.fromEntries(
      PITCH_KINDS.map((k) => [k, DECK[k].filter((id) => byClub.has(id))]),
    ) as Record<PitchKind, string[]>;
    return { byId, byClub, club, deck };
  })();
  return index;
}

const pick = <T,>(xs: readonly T[], rng: () => number): T => xs[Math.floor(rng() * xs.length)]!;

/**
 * A hand: one club of each kind, none of them thrown yet this match. When a
 * pile is used up the match goes on with repeats from it — a nine-inning
 * game can outlast the knuckleballs — but never before.
 */
export async function deal(pitched: readonly string[], rng: () => number = Math.random): Promise<Pitch[]> {
  const { deck, club } = await loadIndex();
  const thrown = new Set(pitched);
  return PITCH_KINDS.map((kind) => {
    const fresh = deck[kind].filter((id) => !thrown.has(id));
    const id = pick(fresh.length ? fresh : deck[kind], rng);
    return { ...club(id), kind };
  });
}

/**
 * The ruling. Did they play there; if so, how deep a cut is it.
 *
 * A stint with no league appearances on record still counts — he was on the
 * books — and grades as the deep cut it is. On a miss the clubs they did
 * play for come back, busiest first, so the table gets its "ahh".
 */
export async function judge(clubId: string, playerId: string): Promise<Verdict | null> {
  const { byId, club } = await loadIndex();
  const p = byId.get(playerId);
  if (!p) return null;
  const player = { id: p.id, name: p.name };
  const apps = (c: string) => p.spells?.[c]?.[0] ?? null;
  if (!p.clubIds.includes(clubId)) {
    const clubs = [...p.clubIds]
      .sort((a, b) => (apps(b) ?? 0) - (apps(a) ?? 0))
      .slice(0, 8)
      .map(club);
    return { verdict: 'miss', player, clubs };
  }
  return {
    verdict: 'hit',
    player,
    bases: basesFor(stintFame(p, clubId)),
    apps: apps(clubId),
    club: club(clubId),
  };
}
