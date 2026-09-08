import { readFile } from 'node:fs/promises';
import { linkColour } from '../src/lib/chemistry/link';
import type { Player } from '../src/lib/chemistry/types';

/**
 * How many answers does each candidate chain LAYOUT admit?
 *
 * Usage: tsx scripts/measure-layouts.ts [mode]        mode: clubs | chemistry
 *
 * The alternating layout (G ? G ? G) was chosen because two adjacent blanks
 * measured hopeless: in chemistry mode 1,290 of 1,349 famous end-pairs admitted
 * more than a thousand fills, because nation+league bridges almost anyone to
 * anyone. That measurement was taken BEFORE club-only mode existed, and club
 * mode deletes exactly the edges that caused the explosion. So it is worth
 * re-running rather than quoting.
 *
 * Layouts measured:
 *   PAIR    G ? ? G    the two found players must link to each other
 *   ALT     G ? G ? G  the shipped layout, for comparison
 *   ENDS    ? G ? G ?  blanks on the outside, each with one neighbour
 */
const MODE = (process.argv[2] ?? 'clubs') as 'clubs' | 'chemistry';
const MIN_FAME = Number(process.env.MIN_FAME ?? 65);
const MAX_CLUBS = Number(process.env.MAX_CLUBS ?? 4);
const GIVEN_POOL = Number(process.env.GIVEN_POOL ?? 80);

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];

const byClub = new Map<string, Player[]>();
const byNation = new Map<string, Player[]>();
for (const p of pool) {
  for (const c of p.clubIds) {
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p);
  }
  if (!byNation.has(p.nation)) byNation.set(p.nation, []);
  byNation.get(p.nation)!.push(p);
}

const cache = new Map<string, Player[]>();
function linksTo(p: Player): Player[] {
  const hit = cache.get(p.id);
  if (hit) return hit;
  const out = new Map<string, Player>();
  for (const c of p.clubIds) for (const q of byClub.get(c) ?? []) if (q.id !== p.id) out.set(q.id, q);
  if (MODE === 'chemistry') {
    for (const q of byNation.get(p.nation) ?? []) {
      if (q.id !== p.id && q.leagueIds.some((l) => p.leagueIds.includes(l))) out.set(q.id, q);
    }
  }
  const arr = [...out.values()];
  cache.set(p.id, arr);
  return arr;
}

const shareClub = (a: Player, b: Player) => a.clubIds.some((c) => b.clubIds.includes(c));
const links = (a: Player, b: Player) => {
  if (MODE === 'clubs') return shareClub(a, b);
  const c = linkColour(a, b);
  return c === 'green' || c === 'hyper';
};

const givens = pool
  .filter((p) => p.fame.value >= MIN_FAME && p.clubIds.length <= MAX_CLUBS)
  .sort((a, b) => b.fame.value - a.fame.value)
  .slice(0, GIVEN_POOL);

/** G ? ? G — every ordered pair (x, y) with u-x, x-y, y-v. */
function pairFills(u: Player, v: Player): number {
  const us = linksTo(u);
  const vsSet = new Set(linksTo(v).map((p) => p.id));
  let n = 0;
  for (const x of us) {
    if (x.id === v.id) continue;
    for (const y of linksTo(x)) {
      if (y.id === u.id || y.id === v.id || y.id === x.id) continue;
      if (vsSet.has(y.id)) n++;
    }
  }
  return n;
}

/** G ? G — the bridges between two givens, which is the shipped layout. */
function bridgeFills(u: Player, v: Player): number {
  const vs = new Set(linksTo(v).map((p) => p.id));
  return linksTo(u).filter((p) => vs.has(p.id) && p.id !== u.id && p.id !== v.id).length;
}

const buckets = (xs: number[]) => {
  const b = { '0': 0, '1-7': 0, '8-40': 0, '41-150': 0, '151-600': 0, '601+': 0 };
  for (const n of xs) {
    if (n === 0) b['0']++;
    else if (n <= 7) b['1-7']++;
    else if (n <= 40) b['8-40']++;
    else if (n <= 150) b['41-150']++;
    else if (n <= 600) b['151-600']++;
    else b['601+']++;
  }
  return b;
};

console.log(`mode: ${MODE}, ${givens.length} candidate givens, fame >= ${MIN_FAME}\n`);

const pairCounts: number[] = [];
const bridgeCounts: number[] = [];
let considered = 0;
for (let i = 0; i < givens.length; i++) {
  for (let j = i + 1; j < givens.length; j++) {
    const u = givens[i]!;
    const v = givens[j]!;
    // Ends that already link to each other make the blanks pointless.
    if (links(u, v)) continue;
    considered++;
    pairCounts.push(pairFills(u, v));
    bridgeCounts.push(bridgeFills(u, v));
  }
}

console.log(`${considered} end-pairs that do not already link\n`);
console.log('G ? ? G   (the two found players must link to each other)');
console.table(buckets(pairCounts));
console.log('G ? G     (one blank between two givens, the shipped layout)');
console.table(buckets(bridgeCounts));

const playable = pairCounts.filter((n) => n >= 3 && n <= 250).length;
console.log(`\nG ? ? G pairs landing in a playable 3-250 answers: ${playable} of ${considered}`);

/**
 * G ? =[club]= ? G — the two found players must link to each other THROUGH A
 * NAMED CLUB, shown on the board as a badge before either is found.
 *
 * Two free adjacent blanks do not work: the club graph is too dense, and the
 * table above shows 2,551 of 2,642 end-pairs admitting more than 600 pairs.
 * Naming the club that joins them is what makes the layout playable, and it is
 * the one constraint that is self-explaining in club mode, because the board
 * can simply show the badge.
 */
const clubName = new Map<string, number>();
for (const p of pool) for (const c of p.clubIds) clubName.set(c, (clubName.get(c) ?? 0) + 1);

function namedClubFills(u: Player, v: Player, c: string): number {
  const inClub = byClub.get(c) ?? [];
  const xs = inClub.filter((p) => p.id !== u.id && p.id !== v.id && shareClub(p, u));
  const ys = inClub.filter((p) => p.id !== u.id && p.id !== v.id && shareClub(p, v));
  let n = 0;
  for (const x of xs) for (const y of ys) if (x.id !== y.id) n++;
  return n;
}

let withOption = 0;
const options: number[] = [];
for (let i = 0; i < givens.length; i++) {
  for (let j = i + 1; j < givens.length; j++) {
    const u = givens[i]!;
    const v = givens[j]!;
    if (links(u, v)) continue;
    // Only clubs big enough to be recognisable are worth naming on a board.
    let good = 0;
    for (const [c, size] of clubName) {
      if (size < 25) continue;
      const n = namedClubFills(u, v, c);
      if (n >= 4 && n <= 250) good++;
    }
    options.push(good);
    if (good > 0) withOption++;
  }
}
console.log(`\nG ? =[named club]= ? G`);
console.log(`  end-pairs with at least one playable club: ${withOption} of ${considered}`);
console.log(`  median clubs available per end-pair: ${options.sort((a, b) => a - b)[Math.floor(options.length / 2)]}`);
