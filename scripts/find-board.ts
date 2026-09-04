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

for (let attempt = 0; attempt < 4000 && !best; attempt++) {
  const filled: Record<string, string> = {};
  let ok = true;
  for (const slotId of order) {
    // Half the slots draw from a famous-first list so anchors actually appear.
    const all = byPos.get(slotId)!.filter((p) => p.clubIds.length <= MAX_CLUBS);
    const cands = rand() < 0.4
      ? shuffle(all.filter((p) => p.fame.value >= FAMOUS_AT)).slice(0, 400)
      : shuffle(all).slice(0, 600);
    const hit = cands.find((c) => !Object.values(filled).includes(c.id) && greenTo(c, filled, slotId));
    if (!hit) { ok = false; break; }
    filled[slotId] = hit.id;
  }
  if (!ok) continue;
  const clubs = new Set(Object.values(filled).flatMap((id) => byId.get(id)!.clubIds)).size;
  const chem = scoreBoard(f, byId, filled).squadChemistry;
  const distinctPrimary = new Set(Object.values(filled).map((id) => byId.get(id)!.clubIds[0])).size;
  const famous = Object.values(filled).filter((id) => byId.get(id)!.fame.value >= FAMOUS_AT).length;
  if (chem >= 100 && distinctPrimary >= MIN_CLUBS && famous >= MIN_FAMOUS) {
    best = { placement: filled, chem, clubs };
  }
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
  const bySlotFame = f.slots
    .map((s) => ({ slot: s.id, fame: byId.get(best!.placement[s.id]!)!.fame.value }))
    .sort((a, b) => b.fame - a.fame);
  const seedSlots = [
    bySlotFame.find((x) => ['GK', 'LCB', 'RCB', 'LB', 'RB'].includes(x.slot))?.slot,
    bySlotFame.find((x) => ['LCM', 'CM', 'RCM'].includes(x.slot))?.slot,
    bySlotFame.find((x) => ['LW', 'ST', 'RW'].includes(x.slot))?.slot,
  ].filter((s): s is string => !!s);

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
