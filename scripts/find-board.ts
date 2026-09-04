import { readFile, writeFile } from 'node:fs/promises';
import { linkColour } from '../src/lib/chemistry/link';
import { FORMATION_433 } from '../src/lib/puzzle/formations';
import { adjacentSlots, edgeKey } from '../src/lib/puzzle/edges';
import { scoreBoard } from '../src/lib/puzzle/validate';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Randomised search for a heterogeneous XI reaching the chemistry gate.
 *
 * A single-club XI trivially hits 110 and is worthless as a puzzle: every link
 * is green for the same reason, so the board carries no information. We
 * therefore reject XIs drawn from too few distinct clubs.
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const byId = new Map(pool.map((p) => [p.id, p]));
const f = FORMATION_433;

const byPos = new Map<string, Player[]>();
for (const slot of f.slots) {
  byPos.set(slot.id, pool.filter((p) => p.positions.includes(slot.position)));
}

const seed = Number(process.argv[2] ?? 1);
let rng = seed;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [r[i], r[j]] = [r[j]!, r[i]!]; }
  return r;
};

const MIN_CLUBS = Number(process.argv[3] ?? 5);

/**
 * Fame anchoring. A purely random XI from this pool is all deep cuts — the
 * pool's median fame is 27 — which leaves the player no recognisable entry
 * point and nothing to weigh a choice against. Require some well-known names.
 */
const MIN_FAMOUS = Number(process.argv[4] ?? 3);

/**
 * Career-length ceiling. This is the main tightness dial and it is not obvious:
 * a GREEN link means "shares any club with the neighbour", so a neighbour with
 * 12 clubs barely constrains anything, while a one-club player constrains hard.
 * Board 001 was built on well-travelled players and every slot had 100-350
 * legal answers as a result.
 */
const MAX_CLUBS = Number(process.argv[6] ?? 4);

/** Distinct nations required across the XI. See the acceptance check below. */
const MIN_NATIONS = Number(process.argv[8] ?? 6);
const FAMOUS_AT = Number(process.argv[5] ?? 60);
const order = [...f.slots].map((s) => s.id);

let best: { placement: Record<string, string>; chem: number; clubs: number } | null = null;

function greenTo(cand: Player, filled: Record<string, string>, slotId: string): boolean {
  for (const other of adjacentSlots(f, slotId)) {
    const id = filled[other];
    if (!id) continue;
    const c = linkColour(cand, byId.get(id)!);
    if (c !== 'green' && c !== 'hyper') return false;
  }
  return true;
}

/**
 * Pick one seed per third of the pitch such that the three given players share
 * NO club, NO league and NO nation.
 *
 * Three seeds from the same club (board 003 was seeded entirely from Manchester
 * City) let the solver fill every open slot by naming another City player.
 * Sharing a league or a nation is nearly as generous, because a green link only
 * needs nation + league. Making the givens fully disjoint means the three
 * regions of the pitch have to be solved on their own terms.
 *
 * Returns null when this XI cannot produce such a trio, which rejects the XI.
 */
const BANDS = [
  ['GK', 'LCB', 'RCB', 'LB', 'RB'],
  ['LCM', 'CM', 'RCM'],
  ['LW', 'ST', 'RW'],
];

function pickSeeds(placement: Record<string, string>): string[] | null {
  const [bandA, bandB, bandC] = BANDS as [string[], string[], string[]];
  const byFame = (band: string[]) => band
    .map((slot) => ({ slot, p: byId.get(placement[slot]!)! }))
    .sort((x, y) => y.p.fame.value - x.p.fame.value);

  // Nation and club must be pairwise disjoint.
  const disjoint = (a: Player, b: Player) =>
    a.nation !== b.nation &&
    !a.clubIds.some((c) => b.clubIds.includes(c));

  // Leagues are handled separately. Requiring pairwise league-disjointness is
  // unachievable on career data — almost every European player passes through
  // the Premier League at some point, so any two of them share it. What the
  // rule is actually for is stopping all three givens sitting in one league, so
  // that is what is enforced: no single league common to all three.
  const notAllOneLeague = (a: Player, b: Player, c: Player) =>
    !a.leagueIds.some((l) => b.leagueIds.includes(l) && c.leagueIds.includes(l));

  for (const a of byFame(bandA)) {
    for (const b of byFame(bandB)) {
      if (!disjoint(a.p, b.p)) continue;
      for (const c of byFame(bandC)) {
        if (!disjoint(a.p, c.p) || !disjoint(b.p, c.p)) continue;
        if (!notAllOneLeague(a.p, b.p, c.p)) continue;
        return [a.slot, b.slot, c.slot];
      }
    }
  }
  return null;
}

let bestSeeds: string[] | null = null;

/**
 * Anchor-first construction.
 *
 * Random search cannot find these boards. A green link is satisfied by a shared
 * club OR by nation + league, which pulls every XI toward one of two extremes:
 * a single-club side (lots of nations, one club) or a single-nation chain (lots
 * of clubs, one nation). Neither can yield three givens that differ in club,
 * league and nation — the first attempt came out 8/11 English.
 *
 * So the three anchors are chosen FIRST, deliberately disjoint, one per third
 * of the pitch. The rest of the XI is then built around them, which forces the
 * slots between the bands to be bridge players — someone sharing a club with
 * one anchor and a nation-plus-league with another. Those bridges are the
 * interesting part of the puzzle.
 */
const disjoint = (a: Player, b: Player) =>
  a.nation !== b.nation && !a.clubIds.some((c) => b.clubIds.includes(c));

const notAllOneLeague = (a: Player, b: Player, c: Player) =>
  !a.leagueIds.some((l) => b.leagueIds.includes(l) && c.leagueIds.includes(l));

const ANCHOR_SLOTS: [string, string, string] = ['RCB', 'CM', 'ST'];

// Anchors should be recognisable — they are the player's way in.
const anchorPool = (slotId: string) =>
  shuffle(byPos.get(slotId)!.filter((p) => p.fame.value >= FAMOUS_AT && p.clubIds.length <= MAX_CLUBS));

for (let attempt = 0; attempt < 6000 && !best; attempt++) {
  const [sA, sB, sC] = ANCHOR_SLOTS;
  const a = anchorPool(sA)[0];
  const b = anchorPool(sB).find((p) => a && disjoint(a, p));
  const c = anchorPool(sC).find((p) => a && b && disjoint(a, p) && disjoint(b, p) && notAllOneLeague(a, b, p));
  if (!a || !b || !c) continue;

  const filled: Record<string, string> = { [sA]: a.id, [sB]: b.id, [sC]: c.id };

  // Fill the rest most-constrained-first: whichever open slot already has the
  // most placed neighbours is hardest, so solve it while options remain.
  const remaining = f.slots.map((s) => s.id).filter((id) => !filled[id]);
  let ok = true;
  while (remaining.length > 0) {
    remaining.sort((x, y) =>
      adjacentSlots(f, y).filter((n) => filled[n]).length -
      adjacentSlots(f, x).filter((n) => filled[n]).length);
    const slotId = remaining.shift()!;
    const cands = shuffle(byPos.get(slotId)!.filter((p) => p.clubIds.length <= MAX_CLUBS)).slice(0, 900);
    const hit = cands.find((p) => !Object.values(filled).includes(p.id) && greenTo(p, filled, slotId));
    if (!hit) { ok = false; break; }
    filled[slotId] = hit.id;
  }
  if (!ok) continue;

  const chem = scoreBoard(f, byId, filled).squadChemistry;
  if (chem < 100) continue;
  const nations = new Set(Object.values(filled).map((id) => byId.get(id)!.nation)).size;
  if (nations < MIN_NATIONS) continue;

  const clubs = new Set(Object.values(filled).flatMap((id) => byId.get(id)!.clubIds)).size;
  best = { placement: filled, chem, clubs };
  bestSeeds = [sA, sB, sC];
}

if (!best) { console.log(`seed ${seed}: no XI found`); process.exit(0); }

console.log(`seed ${seed}: chemistry ${best.chem}/110, ${best.clubs} distinct clubs across the XI\n`);
for (const slot of f.slots) {
  const p = byId.get(best.placement[slot.id]!)!;
  console.log(`  ${slot.id.padEnd(4)} ${p.name.padEnd(26)} fame ${String(p.fame.value).padStart(3)}`);
}
console.log('\nlink colours produced:');
const counts: Record<string, number> = {};
for (const [a, b] of f.adjacency) {
  const c = linkColour(byId.get(best.placement[a]!)!, byId.get(best.placement[b]!)!);
  counts[c] = (counts[c] ?? 0) + 1;
}
console.log(' ', JSON.stringify(counts));

// Write the board directly. Seeds are the three most famous players, spread so
// the player gets an entry point rather than three names in one corner.
const boardId = process.argv[7];
if (boardId) {
  const seedSlots = bestSeeds!;

  const board = {
    id: boardId,
    formationId: '433',
    seeded: Object.fromEntries(seedSlots.map((s) => [s, best.placement[s]!])),
    required: Object.fromEntries(f.adjacency.map(([a, b]) => [edgeKey(a, b),
      linkColour(byId.get(best!.placement[a]!)!, byId.get(best!.placement[b]!)!)])),
    referenceSolution: best.placement,
  };
  await writeFile(`content/puzzles/${boardId}.json`, JSON.stringify(board, null, 2));
  console.log(`\nwrote content/puzzles/${boardId}.json  seeds: ${seedSlots.join(', ')}`);
}
