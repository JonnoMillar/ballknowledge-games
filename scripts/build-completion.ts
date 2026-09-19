import { readFile, writeFile, readdir } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';
import type { ChainPuzzle, SlotClue } from '../src/lib/chain/types';
import { chainFieldFor, sidesOf, sharedClubsByProminence } from '../src/lib/chain/score';
import { factFame } from '../src/lib/fame/spell';
import { DEMONYM } from '../src/lib/chain/demonyms';

/**
 * Generate completion boards: rings of famous givens with a clue on every
 * plate, each plate promising ONE answer a fan can reach.
 *
 * Usage: tsx scripts/build-completion.ts [--write] [--count N] [--seed S]
 *
 * The rule is the one tests/content/chains.test.ts enforces, so a board
 * this writes is a board that passes: on every plate the reference answer
 * tops its clued field by fact-fame at REACH or above, and the runner-up
 * is under CLIFF. A plate may ask nothing only where at most OPEN answers
 * are in reach at all. Nationality clues only, and only for the nations in
 * DEMONYM — a niche nationality collapses the shelf to one name.
 *
 * The search is over pairs of givens first: a pair either has a good plate
 * between it or it does not, and a ring is three or four good pairs that
 * close. Givens share no club with each other (or the ring would have a
 * link that needs nobody), and the reference answers on one board are
 * distinct. Across boards, no given or answer is used more than CAP times.
 */
const WRITE = process.argv.includes('--write');
const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
};
const COUNT = arg('--count', 40);
const SEED = arg('--seed', 7);

const REACH = 50;
const CLIFF = 35;
const OPEN = 5;
/** A given has to be someone everyone knows. */
const GIVEN_FAME = 70;
/**
 * Fame is a sitelink count across every Wikipedia, and a handful of players
 * clear the bar on wikis the audience does not read. A given also has to
 * have played in leagues the audience follows, which is the same list the
 * graded generator restricts its named clubs to.
 */
const KNOWN_LEAGUES = new Set(['Q9448', 'Q19510', 'Q19565', 'Q15804', 'Q324867', 'Q82595', 'Q13394', 'Q167541', 'Q182994', 'Q14377162', 'Q485568']);
/** Managers whose playing careers are not what anyone knows them for. */
const NOT_A_GIVEN = new Set(['Q4462']); // Joachim Löw
/** A clued shelf needs at least this many names on it to be a recall. */
const SHELF = 3;
/** How often one player may be a given, or an answer, across the set. */
const CAP = 3;

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const byId = new Map(pool.map((p) => [p.id, p]));
const byClub = new Map<string, Player[]>();
for (const p of pool) for (const c of p.clubIds) {
  const list = byClub.get(c) ?? [];
  list.push(p);
  byClub.set(c, list);
}

// A small, seeded PRNG so a rerun with the same seed writes the same boards.
let s = SEED >>> 0;
const rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = <T,>(xs: T[]): T[] => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; };

const givens = pool.filter((p) =>
  p.fame.value >= GIVEN_FAME
  && p.clubIds.length >= 2
  && !NOT_A_GIVEN.has(p.id)
  && p.leagueIds.filter((l) => KNOWN_LEAGUES.has(l)).length >= 2);
console.log(`${givens.length} candidate givens at fame ≥ ${GIVEN_FAME}`);

const shares = (a: Player, b: Player) => a.clubIds.some((c) => b.clubIds.includes(c));

/** Everyone who links to both, under the clubs rule. */
function bridge(a: Player, b: Player): Player[] {
  const seen = new Set<string>();
  const out: Player[] = [];
  for (const c of a.clubIds) for (const p of byClub.get(c) ?? []) {
    if (seen.has(p.id) || p.id === a.id || p.id === b.id) continue;
    seen.add(p.id);
    if (p.clubIds.some((d) => b.clubIds.includes(d))) out.push(p);
  }
  return out;
}

interface Plate { clue: SlotClue | null; answer: Player }

/**
 * The plates a pair admits. Measured with the game's own ruler: fact-fame
 * against these two as sides, exactly as the reveal and the test will.
 */
function platesFor(a: Player, b: Player): Plate[] {
  const field = bridge(a, b);
  if (field.length === 0) return [];
  const sides = [{ player: a }, { player: b }];
  const ranked = field.map((p) => ({ p, f: factFame(p, sides, 'clubs') })).sort((x, y) => y.f - x.f);
  const out: Plate[] = [];
  const inReach = ranked.filter((r) => r.f >= REACH);
  if (inReach.length >= 1 && inReach.length <= OPEN && ranked[0]!.f >= REACH) {
    out.push({ clue: null, answer: ranked[0]!.p });
  }
  const nations = new Set(field.map((p) => p.nation));
  for (const nation of nations) {
    if (!DEMONYM[nation]) continue;
    const shelf = ranked.filter((r) => r.p.nation === nation);
    if (shelf.length < SHELF) continue;
    const [top, second] = shelf;
    if (!top || top.f < REACH) continue;
    if (second && second.f >= CLIFF) continue;
    out.push({ clue: { kind: 'nation', value: nation, label: DEMONYM[nation]! }, answer: top.p });
  }
  return out;
}

// Every good pair, once.
const pairs = new Map<string, Plate[]>();
const key = (a: Player, b: Player) => (a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`);
const partners = new Map<string, Player[]>();
let checked = 0;
for (let i = 0; i < givens.length; i++) {
  for (let j = i + 1; j < givens.length; j++) {
    const a = givens[i]!;
    const b = givens[j]!;
    if (shares(a, b)) continue;
    checked++;
    const plates = platesFor(a, b);
    if (plates.length === 0) continue;
    pairs.set(key(a, b), plates);
    partners.set(a.id, [...(partners.get(a.id) ?? []), b]);
    partners.set(b.id, [...(partners.get(b.id) ?? []), a]);
  }
}
console.log(`${checked} pairs checked, ${pairs.size} admit a plate`);

/** The rule the test applies, run on the finished board before it is kept. */
function passes(puzzle: ChainPuzzle): boolean {
  const ref = puzzle.referenceSolution!;
  return puzzle.slots.every((id, i) => {
    if (id !== null) return true;
    const field = chainFieldFor(i, puzzle.slots, pool, byId, 'clubs', {}, true, puzzle.clues);
    const sides = sidesOf(i, puzzle.slots, byId, {}, true);
    const ranked = field.map((p) => ({ p, f: factFame(p, sides, 'clubs') })).sort((x, y) => y.f - x.f);
    if (ranked[0]?.p.id !== ref[i] || ranked[0]!.f < REACH) return false;
    if (puzzle.clues?.[i]) return !ranked[1] || ranked[1].f < CLIFF;
    return ranked.filter((r) => r.f >= REACH).length <= OPEN;
  });
}

const used = new Map<string, number>();
const use = (id: string) => used.set(id, (used.get(id) ?? 0) + 1);
const free = (id: string) => (used.get(id) ?? 0) < CAP;

/** Prefer a clue where one is possible: an unclued plate is the exception. */
function pickPlate(plates: Plate[], taken: Set<string>): Plate | null {
  const ok = plates.filter((p) => !taken.has(p.answer.id) && free(p.answer.id));
  const clued = ok.filter((p) => p.clue !== null);
  const from = clued.length > 0 ? clued : ok;
  return from.length > 0 ? from[Math.floor(rand() * from.length)]! : null;
}

function build(ring: Player[]): ChainPuzzle | null {
  const n = ring.length;
  const slots: (string | null)[] = [];
  const ref: string[] = [];
  const clues: Record<number, SlotClue> = {};
  const taken = new Set(ring.map((p) => p.id));
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    const plate = pickPlate(pairs.get(key(a, b)) ?? [], taken);
    if (!plate) return null;
    slots.push(a.id, null);
    ref.push(a.id, plate.answer.id);
    taken.add(plate.answer.id);
    if (plate.clue) clues[2 * i + 1] = plate.clue;
  }
  const puzzle: ChainPuzzle = {
    id: '000', mode: 'clubs', difficulty: 'medium', closed: true, scoring: 'completion',
    slots, clues, referenceSolution: ref,
  };
  return passes(puzzle) ? puzzle : null;
}

const boards: ChainPuzzle[] = [];
const seenRings = new Set<string>();
const order = shuffle(givens.filter((g) => partners.has(g.id)));

// Rings of three (six slots) and four (eight slots), alternating, so the
// daily is not the same shape every day.
outer: for (let attempt = 0; attempt < 200000 && boards.length < COUNT; attempt++) {
  const size = boards.length % 2 === 0 ? 3 : 4;
  const a = order[Math.floor(rand() * order.length)]!;
  if (!free(a.id)) continue;
  const ring: Player[] = [a];
  for (let k = 1; k < size; k++) {
    const prev = ring[k - 1]!;
    const options = shuffle(partners.get(prev.id) ?? []).filter((p) => free(p.id) && !ring.includes(p) && ring.every((r) => !shares(r, p)));
    const next = options.find((p) => k < size - 1 || pairs.has(key(p, a)));
    if (!next) continue outer;
    ring.push(next);
  }
  const ringKey = [...ring.map((p) => p.id)].sort().join('|');
  if (seenRings.has(ringKey)) continue;
  const puzzle = build(ring);
  if (!puzzle) continue;
  seenRings.add(ringKey);
  ring.forEach((p) => use(p.id));
  puzzle.referenceSolution!.forEach((id, i) => { if (puzzle.slots[i] === null) use(id); });
  boards.push(puzzle);
}

console.log(`${boards.length} boards built`);

const existing = (await readdir('content/chains')).filter((f) => f.endsWith('.json')).map((f) => Number(f.slice(0, 3)));
let next = Math.max(0, ...existing) + 1;
for (const b of boards) {
  const id = String(next++).padStart(3, '0');
  b.id = id;
  const names = b.slots.map((s, i) => (s ? byId.get(s)!.name : `[${b.clues?.[i]?.label ?? 'anyone'} → ${byId.get(b.referenceSolution![i]!)!.name}]`));
  console.log(`${id}: ${names.join(' — ')}`);
  if (WRITE) await writeFile(`content/chains/${id}.json`, JSON.stringify(b, null, 2) + '\n');
}
if (!WRITE) console.log('(dry run; pass --write to keep them)');

// Keep the linter honest about an import the passes() check does not use.
void sharedClubsByProminence;
