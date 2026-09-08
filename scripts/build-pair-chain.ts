import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';
import type { ClubRecord } from '../src/lib/clubs';

/**
 * Generate a PAIR chain: G ? =[named club]= ? G.
 *
 * Usage: tsx scripts/build-pair-chain.ts [seed] [id]
 *
 * Four slots, two of them blank and SIDE BY SIDE, with the club that has to
 * join them named on the board from the start. The two players you find have
 * to link to each other, which the alternating layout never asks.
 *
 * Two adjacent blanks with no further constraint do not work, and that is
 * measured rather than assumed: across 2,642 pairs of famous ends in club
 * mode, 2,551 admit more than 600 valid pairs and NOT ONE lands in a playable
 * range. The club graph is too dense for adjacency to constrain anything.
 *
 * Naming the club collapses it. The same 2,642 end-pairs yield at least one
 * club with a sane answer count for 2,563 of them, with a median of 211 clubs
 * to choose between — so the layout has an enormous amount of content in it
 * rather than a handful of lucky boards. See scripts/measure-layouts.ts.
 *
 * The named club is a HARDER rule than the mode's, not a hint: two players who
 * share some other club do not satisfy it.
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;

const seed = Number(process.argv[2] ?? 1);
const outId = process.argv[3];

/** The givens are the way in, so they have to be recognisable. */
const MIN_FAME = Number(process.env.MIN_FAME ?? 65);
const MAX_CLUBS = Number(process.env.MAX_CLUBS ?? 5);
const GIVEN_POOL = Number(process.env.GIVEN_POOL ?? 70);

/**
 * A club nobody has heard of is a rule the player cannot reason about, so the
 * named club is drawn from the most-represented clubs in the pool rather than
 * from anything above a floor. The first version used a floor of 40 members
 * and produced a board hinging on Granada CF.
 */
const CLUB_POOL = Number(process.env.CLUB_POOL ?? 120);

/**
 * Answers available on EACH side.
 *
 * The pair count alone is not enough: 3 players on the left and 28 on the
 * right multiplies out to a respectable 83 pairs while the left blank is
 * effectively a single lookup. Both halves have to be a real choice.
 */
const MIN_SIDE = Number(process.env.MIN_SIDE ?? 6);

/** Answer pairs. Too few and it is a lookup; too many and anything works. */
const MIN_ANSWERS = Number(process.env.MIN_ANSWERS ?? 6);
const MAX_ANSWERS = Number(process.env.MAX_ANSWERS ?? 120);

const byClub = new Map<string, Player[]>();
for (const p of pool) {
  for (const c of p.clubIds) {
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p);
  }
}

const shareClub = (a: Player, b: Player) => a.clubIds.some((c) => b.clubIds.includes(c));

let rng = seed;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

const givens = shuffle(
  pool
    .filter((p) => p.fame.value >= MIN_FAME && p.clubIds.length <= MAX_CLUBS)
    .sort((a, b) => b.fame.value - a.fame.value)
    .slice(0, GIVEN_POOL),
);

const bigClubs = shuffle(
  [...byClub.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, CLUB_POOL)
    .map(([id]) => id),
);

interface Board {
  left: Player;
  right: Player;
  club: string;
  xs: Player[];
  ys: Player[];
  answers: number;
}

function evaluate(left: Player, right: Player, club: string): Board | null {
  const members = byClub.get(club) ?? [];

  // A given who already played for the named club makes its side free: any
  // member of that club would satisfy the outer link automatically.
  if (left.clubIds.includes(club) || right.clubIds.includes(club)) return null;

  const xs = members.filter((p) => p.id !== left.id && p.id !== right.id && shareClub(p, left));
  const ys = members.filter((p) => p.id !== left.id && p.id !== right.id && shareClub(p, right));
  if (xs.length < MIN_SIDE || ys.length < MIN_SIDE) return null;

  // Ordered pairs, minus the ones that would need the same player twice.
  const both = xs.filter((p) => ys.some((q) => q.id === p.id)).length;
  const answers = xs.length * ys.length - both;
  if (answers < MIN_ANSWERS || answers > MAX_ANSWERS) return null;

  return { left, right, club, xs, ys, answers };
}

let board: Board | null = null;
outer:
for (const left of givens) {
  for (const right of givens) {
    if (right.id === left.id) continue;
    // Ends that already link have nothing for the middle to do.
    if (shareClub(left, right)) continue;
    for (const club of bigClubs) {
      const found = evaluate(left, right, club);
      if (found) { board = found; break outer; }
    }
  }
}

if (!board) {
  console.log(`seed ${seed}: no pair chain found at these thresholds`);
  process.exit(0);
}

const clubLabel = clubs[board.club]?.name ?? board.club;

// The reference solution takes the most obscure legal pair, which is also the
// score ceiling. It is never shown, and it is not "the" answer.
const byObscurity = (a: Player, b: Player) => a.fame.value - b.fame.value;
const x = [...board.xs].sort(byObscurity)[0]!;
const y = [...board.ys].sort(byObscurity).find((p) => p.id !== x.id)!;

console.log(`seed ${seed}: pair chain through ${clubLabel}\n`);
console.log(`  GIVEN  ${board.left.name.padEnd(26)} fame ${board.left.fame.value}`);
console.log(`    ?    (${board.xs.length} players link ${board.left.name} and ${clubLabel})`);
console.log(`         == ${clubLabel} ==`);
console.log(`    ?    (${board.ys.length} players link ${clubLabel} and ${board.right.name})`);
console.log(`  GIVEN  ${board.right.name.padEnd(26)} fame ${board.right.fame.value}`);
console.log(`\n  ${board.answers} valid pairs`);
console.log(`  deepest: ${x.name} (${x.fame.value}) + ${y.name} (${y.fame.value})`);

if (outId) {
  const puzzle = {
    id: outId,
    mode: 'clubs' as const,
    slots: [board.left.id, null, null, board.right.id],
    prescribedLinks: { 1: board.club },
    referenceSolution: [board.left.id, x.id, y.id, board.right.id],
  };
  await mkdir('content/chains', { recursive: true });
  await writeFile(`content/chains/${outId}.json`, JSON.stringify(puzzle, null, 2));
  console.log(`\nwrote content/chains/${outId}.json`);
}
