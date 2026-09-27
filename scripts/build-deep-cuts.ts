import { readFile, writeFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';
import type { ClubRecord } from '../src/lib/clubs';
import { chainResult } from '../src/lib/chain/result';
import type { ChainPuzzle } from '../src/lib/chain/types';

/**
 * Generate the Deep Cuts boards: G ? =[named club]= ? G, the shape of chain
 * 006, built for digging rather than for finding.
 *
 * Usage: tsx scripts/build-deep-cuts.ts [--count 30] [--write]
 *
 * A Deep Cuts board is graded on how deep the player goes, so it needs the
 * opposite of a daily: WIDE fields, many checkable answers on each side, so
 * there is somewhere to dig. It still needs an obvious way in (a famous pair
 * that solves it), because a board nobody can hold is a board nobody grades.
 * See scripts/build-graded-chains.ts for the layout and the ENTRY measure,
 * and tests/content/chains.test.ts for the rules every board is held to.
 *
 * Seeded by construction: no randomness, so a rerun writes the same boards.
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;
const byId = new Map(pool.map((p) => [p.id, p]));

const WRITE = process.argv.includes('--write');
const COUNT = Number(process.argv[process.argv.indexOf('--count') + 1]) || 30;
/** Board ids 101 upwards: clear of the ladder (006–009) and the dailies (010–071). */
const FIRST_ID = 101;

/** Givens a British fan places at once. */
const MIN_FAME = 70;
const MAX_CLUBS = 6;
/** The named club: one of the biggest clubs in a league the audience follows. */
const CLUB_POOL = 60;
/** Both sides wide, so there is a long way down. */
const MIN_SIDE = 25;
/** ...with enough checkable names to make a deep answer something you can know. */
const MIN_KNOWN = 12;
const KNOWN_FAME = 30;
/** And a famous way in: the easiest legal pair is two names people hold. */
const MIN_ENTRY = 60;
/** No given twice; a named club at most twice across the set. */
const CLUB_REPEATS = 2;

const ALLOWED_LEAGUES = new Set([
  'Q9448', 'Q19510', 'Q19565', 'Q15804', 'Q324867', 'Q82595', 'Q13394',
  'Q167541', 'Q182994', 'Q14377162', 'Q485568',
]);

const byClub = new Map<string, Player[]>();
for (const p of pool) for (const c of p.clubIds) {
  if (!byClub.has(c)) byClub.set(c, []);
  byClub.get(c)!.push(p);
}
const shareClub = (a: Player, b: Player) => a.clubIds.some((c) => b.clubIds.includes(c));

const clubLeague = new Map<string, string>();
{
  const votes = new Map<string, Map<string, number>>();
  for (const p of pool) p.clubIds.forEach((c, i) => {
    const l = p.leagueIds[i];
    if (!l) return;
    if (!votes.has(c)) votes.set(c, new Map());
    votes.get(c)!.set(l, (votes.get(c)!.get(l) ?? 0) + 1);
  });
  for (const [c, v] of votes) clubLeague.set(c, [...v.entries()].sort((a, b) => b[1] - a[1])[0]![0]);
}

const clubRanking = [...byClub.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, CLUB_POOL)
  .map(([id]) => id)
  .filter((id) => ALLOWED_LEAGUES.has(clubLeague.get(id) ?? ''));

/** Managers whose playing careers are not what anyone knows them for, as in build-completion.ts. */
const NOT_A_GIVEN = new Set(['Q4462']); // Joachim Löw
const givens = pool
  .filter((p) => p.fame.value >= MIN_FAME && p.clubIds.length >= 2 && p.clubIds.length <= MAX_CLUBS && !NOT_A_GIVEN.has(p.id))
  .sort((a, b) => b.fame.value - a.fame.value || a.id.localeCompare(b.id));

interface Board { left: Player; right: Player; club: string; xs: Player[]; ys: Player[]; entry: number; answers: number }

function entryOf(xs: Player[], ys: Player[]): number {
  const top = (ps: Player[]) => [...ps].sort((a, b) => b.fame.value - a.fame.value).slice(0, 2);
  let best = 0;
  for (const x of top(xs)) for (const y of top(ys)) if (x.id !== y.id) best = Math.max(best, Math.min(x.fame.value, y.fame.value));
  return best;
}

const boards: Board[] = [];
for (const left of givens) {
  for (const right of givens) {
    if (right.id <= left.id || shareClub(left, right)) continue;
    for (const club of clubRanking) {
      if (left.clubIds.includes(club) || right.clubIds.includes(club)) continue;
      const members = byClub.get(club)!;
      const xs = members.filter((p) => p.id !== left.id && p.id !== right.id && shareClub(p, left));
      if (xs.length < MIN_SIDE) continue;
      const ys = members.filter((p) => p.id !== left.id && p.id !== right.id && shareClub(p, right));
      if (ys.length < MIN_SIDE) continue;
      const known = (ps: Player[]) => ps.filter((p) => p.fame.value >= KNOWN_FAME).length;
      if (known(xs) < MIN_KNOWN || known(ys) < MIN_KNOWN) continue;
      const entry = entryOf(xs, ys);
      if (entry < MIN_ENTRY) continue;
      const both = xs.filter((p) => ys.some((q) => q.id === p.id)).length;
      boards.push({ left, right, club, xs, ys, entry, answers: xs.length * ys.length - both });
    }
  }
}
console.log(`${boards.length} candidate boards`);

// Prefer famous ends and even sides; then take them greedily, keeping the set varied.
const balance = (b: Board) => Math.min(b.xs.length, b.ys.length) / Math.max(b.xs.length, b.ys.length);
boards.sort((a, b) =>
  (b.left.fame.value + b.right.fame.value) - (a.left.fame.value + a.right.fame.value)
  || balance(b) - balance(a)
  || a.club.localeCompare(b.club));

const usedGivens = new Set<string>();
const clubUses = new Map<string, number>();
const chosen: Board[] = [];
for (const b of boards) {
  if (chosen.length >= COUNT + 10) break;
  if (usedGivens.has(b.left.id) || usedGivens.has(b.right.id)) continue;
  if ((clubUses.get(b.club) ?? 0) >= CLUB_REPEATS) continue;
  chosen.push(b);
  usedGivens.add(b.left.id);
  usedGivens.add(b.right.id);
  clubUses.set(b.club, (clubUses.get(b.club) ?? 0) + 1);
}

let written = 0;
for (const b of chosen) {
  if (written >= COUNT) break;
  const id = String(FIRST_ID + written);
  const puzzle: ChainPuzzle = {
    id, mode: 'clubs', deep: true,
    slots: [b.left.id, null, null, b.right.id],
    prescribedLinks: { 1: b.club },
  };
  // The reference solution is the Grail on each plate, measured exactly as
  // the seal measures it (chainResult's `best`: the deepest answer above the
  // fame floor, on the fact-fame ruler). `best` depends only on the board,
  // so any legal fill reads it out.
  const probe = [b.left.id, b.xs.find((p) => p.id !== b.ys[0]!.id)!.id, b.ys[0]!.id, b.right.id];
  const bests = chainResult(probe, puzzle, pool, byId).slots.map((s) => s.best?.id);
  if (!bests[0] || !bests[1] || bests[0] === bests[1]) {
    console.log(`skipped ${b.left.name} to ${b.right.name}: one player is the Grail on both plates`);
    continue;
  }
  written++;
  console.log(`${id}  ${b.left.name} ? =${clubs[b.club]?.name ?? b.club}= ? ${b.right.name}   sides ${b.xs.length}/${b.ys.length} · entry ${b.entry}`);
  if (WRITE) {
    const out = { ...puzzle, referenceSolution: [b.left.id, bests[0], bests[1], b.right.id] };
    await writeFile(`content/chains/${id}.json`, JSON.stringify(out, null, 2) + '\n');
  }
}
if (written < COUNT) console.log(`only ${written} of ${COUNT} boards found`);
if (WRITE) console.log(`wrote ${written} boards to content/chains/`);
