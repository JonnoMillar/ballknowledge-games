import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';
import type { ChainDifficulty } from '../src/lib/chain/types';
import type { ClubRecord } from '../src/lib/clubs';

/**
 * Generate a GRADED SET of pair chains: G ? =[named club]= ? G, one per band.
 *
 * Usage: tsx scripts/build-graded-chains.ts [--write]
 *
 * The layout is the one measured in scripts/measure-layouts.ts. What this adds
 * is difficulty as a MEASURED property rather than a label, so the three
 * boards we ship are demonstrably different in how hard they are.
 *
 * The measure is ENTRY: over every legal PAIR, the largest value of the less
 * famous of the two. It answers the only question that decides whether a board
 * is hard — is there an obvious way in? A board whose easiest legal pair
 * contains a deep cut cannot be solved by naming the first players who come to
 * mind, however large the field behind it.
 *
 * Taking each side's most famous answer independently is the obvious measure
 * and it is WRONG: the two slots need two different players, and the boards
 * that measure easiest are exactly the ones where a single player tops both
 * sides and can only fill one of them. Hence the pair.
 *
 * Fame is a sitelink count, so it is unbounded rather than 0..100; across all
 * 121,780 boards the naive per-side measure has p10 52, p50 69 and p90 91.
 *
 * Field size is the second lever and pulls the other way: a large field is
 * forgiving, so the hard band is narrowed as well as deepened.
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;

const WRITE = process.argv.includes('--write');

/** The givens are the way in, so they have to be recognisable in every band. */
const MIN_FAME = 65;
const MAX_CLUBS = 5;
const GIVEN_POOL = 70;

/** A club nobody has heard of is a rule the player cannot reason about. */
const CLUB_POOL = 120;

/**
 * Leagues the named club may come from, identified by the clubs that vote for
 * them below. Ranking clubs by pool size alone is not enough, because fame is
 * a sitelink count across ALL Wikipedias: the J-League is the single largest
 * bloc in the top 120 clubs, at 23 of them, and its players score well on
 * ja.wikipedia while being unknown to this game's audience. A board through
 * FC Tokyo grades as MEDIUM and is unplayable.
 *
 * Worse, the evenness rule below actively seeks such boards out — a league
 * whose players all draw from one Wikipedia has beautifully even fame.
 *
 * Brazil is excluded on the same grounds and is the harder call: Flamengo and
 * Cruzeiro are recognisable where their squads are not, and it is the squads
 * that have to be recalled.
 */
const ALLOWED_LEAGUES = new Set([
  'Q9448', // Premier League — Chelsea, Liverpool, Man City, Man Utd, Spurs
  'Q19510', // EFL Championship — West Ham, Blackburn, Middlesbrough, Watford
  'Q19565', // English tier — Leicester, Wigan
  'Q15804', // Serie A — Inter, Milan, Juventus, Roma, Fiorentina
  'Q324867', // La Liga — Barcelona, Real Madrid, Atlético, Valencia, Sevilla
  'Q82595', // Bundesliga — Bayern, Leverkusen, Dortmund, Stuttgart, Schalke
  'Q13394', // Ligue 1 — Marseille, Monaco, PSG, Lyon, Rennes
  'Q167541', // Eredivisie — Ajax, PSV, Feyenoord
  'Q182994', // Primeira Liga — Benfica, Porto, Sporting
  'Q14377162', // Scottish Premiership — Celtic, Rangers
  'Q485568', // Süper Lig — Galatasaray, Fenerbahçe, Beşiktaş
]);

/** Both halves have to be a real choice, not one choice and one lookup. */
const MIN_SIDE = 6;

/**
 * Fame floor for the REFERENCE SOLUTION only — not for what the game accepts.
 *
 * Taking the single most obscure legal pair is the natural choice, and it aims
 * the one claim we make straight at the least-curated corner of the data.
 * Rodrigo Riep, a Chilean journeyman at fame 22 whose career is otherwise
 * entirely South American, is listed as a member of Everton F.C. and FC
 * Barcelona; he played for Everton de Viña del Mar and Barcelona S.C., which
 * exist as separate items and which he ALSO holds. Verified against the live
 * API — the claims are upstream, so we cannot correct them here.
 *
 * That is one confirmed case rather than a measured rate, and the tail is not
 * as bad as it first looks: several spells that read as errors turned out to
 * be transfers from 2026 the reviewer had not heard of. But a fame floor costs
 * nothing and moves the one pair we assert is correct — the pair the tests
 * prove solvable and the reveal holds up as the ceiling — onto players with
 * enough of a footprint to have been checked by somebody. The field itself is
 * untouched: a bad answer is still accepted, it just never gets held up as the
 * answer you missed.
 */
const MIN_REFERENCE_FAME = 30;

interface Band {
  id: string;
  difficulty: ChainDifficulty;
  /** Fame of the easiest legal answer, minimum over the two sides. */
  entry: [number, number];
  /** Valid ordered pairs. */
  answers: [number, number];
  /**
   * Where the named club sits in the pool-size ranking. A top-tier club is a
   * rule you can reason about from memory; one further down is itself work.
   */
  clubRank: [number, number];
}

const BANDS: Band[] = [
  // Solvable by naming the first player who comes to mind, on a huge field.
  { id: '006', difficulty: 'easy', entry: [90, 999], answers: [120, 300], clubRank: [0, 40] },
  // A famous-ish answer exists on both sides, but neither is the obvious one.
  { id: '007', difficulty: 'medium', entry: [56, 68], answers: [60, 200], clubRank: [0, 80] },
  // No household name fits either side, and the field is small enough that a
  // guess is unlikely to land.
  { id: '008', difficulty: 'hard', entry: [30, 46], answers: [24, 70], clubRank: [60, 120] },
];

const byClub = new Map<string, Player[]>();
for (const p of pool) {
  for (const c of p.clubIds) {
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p);
  }
}

const shareClub = (a: Player, b: Player) => a.clubIds.some((c) => b.clubIds.includes(c));

const givens = pool
  .filter((p) => p.fame.value >= MIN_FAME && p.clubIds.length <= MAX_CLUBS)
  .sort((a, b) => b.fame.value - a.fame.value)
  .slice(0, GIVEN_POOL);

/**
 * Which league a club sits in, by majority vote of its members.
 *
 * `leagueIds` is index-aligned with `clubIds` on each player, but not reliably
 * so — Sampdoria collects votes for an A-League entity off the back of one
 * player's mis-ordered spells. A majority is robust to that, and a club whose
 * vote lands somewhere unexpected simply drops out of the allowed set, which
 * costs a candidate and never ships a bad one.
 */
const clubLeague = new Map<string, string>();
{
  const votes = new Map<string, Map<string, number>>();
  for (const p of pool) {
    p.clubIds.forEach((c, i) => {
      const l = p.leagueIds[i];
      if (!l) return;
      if (!votes.has(c)) votes.set(c, new Map());
      const v = votes.get(c)!;
      v.set(l, (v.get(l) ?? 0) + 1);
    });
  }
  for (const [c, v] of votes) {
    clubLeague.set(c, [...v.entries()].sort((a, b) => b[1] - a[1])[0]![0]);
  }
}

/** Ranked by pool size, so index 0 is the club the most players passed through. */
const clubRanking = [...byClub.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, CLUB_POOL)
  .map(([id]) => id)
  .filter((id) => ALLOWED_LEAGUES.has(clubLeague.get(id) ?? ''));

console.log(`${clubRanking.length} of the top ${CLUB_POOL} clubs are in an allowed league`);

interface Board {
  left: Player;
  right: Player;
  club: string;
  rank: number;
  xs: Player[];
  ys: Player[];
  answers: number;
  entry: number;
  /** The legal pair that maximises ENTRY: the most findable way to solve it. */
  easiest: { x: Player; y: Player };
}

/**
 * The legal pair whose weaker half is as famous as possible — the way in that
 * asks least of the player.
 *
 * Only the top two of each side can matter. A pair beaten by neither side's
 * top choice can only be blocked by the two being the same player, and one
 * player blocks one rank, so rank three is never the answer.
 */
function easiestPair(xs: Player[], ys: Player[]): { x: Player; y: Player } {
  const desc = (a: Player, b: Player) => b.fame.value - a.fame.value;
  const top = (ps: Player[]) => [...ps].sort(desc).slice(0, 2);
  let best: { x: Player; y: Player } | null = null;
  for (const x of top(xs)) {
    for (const y of top(ys)) {
      if (x.id === y.id) continue;
      const m = Math.min(x.fame.value, y.fame.value);
      if (!best || m > Math.min(best.x.fame.value, best.y.fame.value)) best = { x, y };
    }
  }
  return best!;
}

const boards: Board[] = [];
for (const left of givens) {
  for (const right of givens) {
    if (right.id === left.id) continue;
    // Ends that already link have nothing for the middle to do.
    if (shareClub(left, right)) continue;
    for (let rank = 0; rank < clubRanking.length; rank++) {
      const club = clubRanking[rank]!;
      // A given who already played for the named club makes its side free.
      if (left.clubIds.includes(club) || right.clubIds.includes(club)) continue;
      const members = byClub.get(club)!;
      const xs = members.filter((p) => p.id !== left.id && p.id !== right.id && shareClub(p, left));
      if (xs.length < MIN_SIDE) continue;
      const ys = members.filter((p) => p.id !== left.id && p.id !== right.id && shareClub(p, right));
      if (ys.length < MIN_SIDE) continue;

      // Ordered pairs, minus the ones that would need the same player twice.
      const both = xs.filter((p) => ys.some((q) => q.id === p.id)).length;
      const answers = xs.length * ys.length - both;
      const easiest = easiestPair(xs, ys);
      const entry = Math.min(easiest.x.fame.value, easiest.y.fame.value);
      boards.push({ left, right, club, rank, xs, ys, answers, entry, easiest });
    }
  }
}

console.log(`${boards.length} candidate boards\n`);

const inBand = (b: Board, band: Band) =>
  b.entry >= band.entry[0] &&
  b.entry <= band.entry[1] &&
  b.answers >= band.answers[0] &&
  b.answers <= band.answers[1] &&
  b.rank >= band.clubRank[0] &&
  b.rank <= band.clubRank[1];

/**
 * Within a band, prefer a board whose two sides are the same size. A lopsided
 * board is really one puzzle and one lookup, whatever its totals say.
 */
const balance = (b: Board) =>
  Math.min(b.xs.length, b.ys.length) / Math.max(b.xs.length, b.ys.length);

/**
 * Same argument as `balance`, in fame rather than count. A board whose easiest
 * pair is one household name and one deep cut is half a puzzle: the deep half
 * sets the grade while the other half gives itself away. Smaller is better.
 */
const evenness = (b: Board) => Math.abs(b.easiest.x.fame.value - b.easiest.y.fame.value);

const fameOf = (b: Board) => b.left.fame.value + b.right.fame.value;

const usedPlayers = new Set<string>();
const usedClubs = new Set<string>();

for (const band of BANDS) {
  const pick = boards
    .filter((b) => inBand(b, band))
    .filter(
      (b) =>
        !usedPlayers.has(b.left.id) && !usedPlayers.has(b.right.id) && !usedClubs.has(b.club),
    )
    .sort(
      (a, b) =>
        balance(b) - balance(a) || evenness(a) - evenness(b) || fameOf(b) - fameOf(a),
    )[0];

  if (!pick) {
    console.log(`${band.id} (${band.difficulty}): NO BOARD in band`);
    continue;
  }
  usedPlayers.add(pick.left.id);
  usedPlayers.add(pick.right.id);
  usedClubs.add(pick.club);

  // The reference solution takes the most obscure legal pair ABOVE the floor,
  // which is also the score ceiling. It is never shown, and it is not "the"
  // answer — several dozen pairs satisfy each of these boards.
  const byObscurity = (a: Player, b: Player) => a.fame.value - b.fame.value;
  const curated = (ps: Player[]) => {
    const above = ps.filter((p) => p.fame.value >= MIN_REFERENCE_FAME);
    return (above.length ? above : ps).sort(byObscurity);
  };
  const x = curated(pick.xs)[0]!;
  const y = curated(pick.ys).find((p) => p.id !== x.id)!;
  const clubLabel = clubs[pick.club]?.name ?? pick.club;

  const easiestX = pick.easiest.x;
  const easiestY = pick.easiest.y;

  console.log(
    `${band.id}  ${band.difficulty.toUpperCase()}  through ${clubLabel} [${pick.club}] (rank ${pick.rank + 1})`,
  );
  console.log(`  GIVEN  ${pick.left.name.padEnd(24)} fame ${pick.left.fame.value}`);
  console.log(`    ?    ${String(pick.xs.length).padStart(3)} link ${pick.left.name} to ${clubLabel}`);
  console.log(`    ?    ${String(pick.ys.length).padStart(3)} link ${clubLabel} to ${pick.right.name}`);
  console.log(`  GIVEN  ${pick.right.name.padEnd(24)} fame ${pick.right.fame.value}`);
  console.log(`  ${pick.answers} valid pairs · entry ${pick.entry}`);
  console.log(`  easiest way in: ${easiestX.name} (${easiestX.fame.value}) + ${easiestY.name} (${easiestY.fame.value})`);
  console.log(`  deepest:        ${x.name} (${x.fame.value}) + ${y.name} (${y.fame.value})\n`);

  if (WRITE) {
    const puzzle = {
      id: band.id,
      mode: 'clubs' as const,
      difficulty: band.difficulty,
      slots: [pick.left.id, null, null, pick.right.id],
      prescribedLinks: { 1: pick.club },
      referenceSolution: [pick.left.id, x.id, y.id, pick.right.id],
    };
    await mkdir('content/chains', { recursive: true });
    await writeFile(`content/chains/${band.id}.json`, JSON.stringify(puzzle, null, 2));
    console.log(`  wrote content/chains/${band.id}.json\n`);
  }
}
