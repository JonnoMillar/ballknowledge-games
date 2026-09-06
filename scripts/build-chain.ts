import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { linkColour } from '../src/lib/chemistry/link';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Generate a CHAIN puzzle: a line of players where every link must be green.
 *
 * Usage: tsx scripts/build-chain.ts [seed] [length] [id]
 *
 *   length 3  ->  G ? G          one player to find
 *   length 5  ->  G ? G ? G      two players to find
 *   length 7  ->  G ? G ? G ? G  three
 *
 * GIVENS SIT AT EVEN INDICES AND BLANKS AT ODD ONES, and that is the single
 * most important decision in this file. It was arrived at by measurement.
 *
 * The first shape tried was the obvious one: a line of four, both ends given,
 * two blanks side by side. It does not work. Across 1,349 eligible pairs of
 * famous ends, 1,290 had MORE THAN A THOUSAND valid fills. Tightening the fame
 * band did nothing (1,494 of 1,501); forcing all four nations to differ did
 * nothing (1,256 of 1,349). Two hops is not a constraint — the club graph puts
 * almost any two well-travelled players within two steps by thousands of
 * routes, so the puzzle collapses into "name any two players you can think of".
 *
 * One blank between two givens is a completely different object. Same ends,
 * same measurement: 100 pairs with 3-15 answers, 576 with 16-60, 574 with
 * 61-250. Tight enough to have to think, wide enough that finding an obscure
 * answer is a real choice rather than a lookup.
 *
 * So a blank always has BOTH neighbours given. Alternating preserves that at
 * any length, and a length of five still reads as the line this format was
 * imagined as — it just puts the third given in the middle, doing the work.
 */
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];

const seed = Number(process.argv[2] ?? 1);
const LENGTH = Number(process.argv[3] ?? 5);
const outId = process.argv[4];

/**
 * `clubs` counts only a shared club as a link; `chemistry` uses the full link
 * table. Club mode is the stricter rule, so it produces smaller answer sets and
 * needs its own bands — but every link it makes can be shown on screen as the
 * badge of the club that made it.
 */
const MODE: 'chemistry' | 'clubs' = process.env.MODE === 'clubs' ? 'clubs' : 'chemistry';

if (LENGTH < 3 || LENGTH % 2 === 0) {
  console.log('length must be odd and at least 3 - givens sit at even indices');
  process.exit(1);
}

/** The givens are the player's way in, so they have to be recognisable. */
const MIN_FAME = Number(process.env.MIN_FAME ?? 65);

/**
 * Career-length ceiling on the givens. A green link is satisfied by any shared
 * club, so a given with twelve clubs barely constrains the blank beside it.
 */
const MAX_CLUBS = Number(process.env.MAX_CLUBS ?? 4);

/**
 * How many answers a blank may have. Below the floor there is no obscure choice
 * left to make; above the ceiling the first name you think of works.
 */
const MIN_ANSWERS = Number(process.env.MIN_ANSWERS ?? 8);
const MAX_ANSWERS = Number(process.env.MAX_ANSWERS ?? 120);

// Green is `sameClub || (sameNation && sameLeague)`, so a player's candidate
// set is the union of two indices. An earlier prototype indexed by club ONLY,
// which silently dropped every nation+league bridge.
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

const linkCache = new Map<string, Player[]>();
/** Everyone this player links to, under the mode in force. */
function linksTo(p: Player): Player[] {
  const hit = linkCache.get(p.id);
  if (hit) return hit;
  const out = new Map<string, Player>();
  for (const c of p.clubIds) for (const q of byClub.get(c) ?? []) if (q.id !== p.id) out.set(q.id, q);
  if (MODE === 'chemistry') {
    for (const q of byNation.get(p.nation) ?? []) {
      if (q.id !== p.id && q.leagueIds.some((l) => p.leagueIds.includes(l))) out.set(q.id, q);
    }
  }
  const arr = [...out.values()];
  linkCache.set(p.id, arr);
  return arr;
}

const shareClub = (a: Player, b: Player) => a.clubIds.some((c) => b.clubIds.includes(c));

const green = (a: Player, b: Player) => {
  const c = linkColour(a, b);
  return c === 'green' || c === 'hyper';
};

/** Every player who bridges u and v. This is the blank's answer set. */
function bridges(u: Player, v: Player, exclude: ReadonlySet<string>): Player[] {
  const vs = new Set(linksTo(v).map((p) => p.id));
  return linksTo(u).filter((p) => vs.has(p.id) && !exclude.has(p.id));
}

/**
 * How far apart two consecutive givens have to be.
 *
 * NOT "share no club, no league and no nation". That was the first rule and it
 * is unachievable: almost every famous European player passes through the
 * Premier League, La Liga or Serie A, so any two of them share a league. With
 * the league clause in, exactly one pair in the whole candidate set survived
 * and every seed returned the same puzzle. It is the same trap the XI boards
 * hit.
 *
 * What the rule is for is stopping a pair from bridging trivially, and that has
 * a precise definition: they must not link green to EACH OTHER, or the blank
 * between them has nothing to do. A shared league alone is an orange link,
 * which trivialises nothing. Different nations on top, so the line is not a
 * walk through one country.
 */
const farApart = (a: Player, b: Player) =>
  MODE === 'clubs'
    // In club mode nation and league do not link anything, so the only thing
    // that would leave the blank between two givens with nothing to do is the
    // givens already sharing a club.
    ? !shareClub(a, b)
    : a.nation !== b.nation && !green(a, b);

let rng = seed;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const candidates = pool
  .filter((p) => p.fame.value >= MIN_FAME && p.clubIds.length <= MAX_CLUBS)
  .sort((a, b) => b.fame.value - a.fame.value)
  .slice(0, Number(process.env.GIVEN_POOL ?? 80));

if (candidates.length < 2) {
  console.log('no candidate givens at these thresholds');
  process.exit(1);
}

const shuffled = [...candidates];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
}

const givenCount = (LENGTH + 1) / 2;

/**
 * Extend a run of givens one at a time, checking the blank each new given
 * creates. Backtracks, because a given that works against its left neighbour
 * may leave no legal blank of its own.
 */
function build(run: Player[]): Player[] | null {
  if (run.length === givenCount) return run;
  for (const next of shuffled) {
    if (run.some((p) => p.id === next.id)) continue;
    const prev = run[run.length - 1]!;
    if (!farApart(prev, next)) continue;
    const used = new Set([...run, next].map((p) => p.id));
    const n = bridges(prev, next, used).length;
    if (n < MIN_ANSWERS || n > MAX_ANSWERS) continue;
    const done = build([...run, next]);
    if (done) return done;
  }
  return null;
}

let givens: Player[] | null = null;
for (const start of shuffled) {
  givens = build([start]);
  if (givens) break;
}

if (!givens) {
  console.log(
    `seed ${seed}: no chain of ${LENGTH} found ` +
      `(wanted ${MIN_ANSWERS}-${MAX_ANSWERS} answers per blank)`,
  );
  process.exit(0);
}

const used = new Set(givens.map((p) => p.id));

// The reference solution takes the most obscure answer at each blank, which is
// also the score ceiling. It is never shown, and it is not "the" answer.
const line: Player[] = [givens[0]!];
const answerCounts: number[] = [];
for (let g = 1; g < givens.length; g++) {
  const u = givens[g - 1]!;
  const v = givens[g]!;
  const options = bridges(u, v, used).sort((a, b) => a.fame.value - b.fame.value);
  answerCounts.push(options.length);
  const bridge = options[0]!;
  used.add(bridge.id);
  line.push(bridge, v);
}

console.log(`seed ${seed}: chain of ${LENGTH}, ${givenCount} given, ${givenCount - 1} to find\n`);
line.forEach((p, i) => {
  const isGiven = i % 2 === 0;
  const label = isGiven ? 'GIVEN' : '  ?  ';
  console.log(
    `  ${label}  ${p.name.padEnd(26)} fame ${String(p.fame.value).padStart(3)}  ${p.clubIds.length} clubs`,
  );
  const next = line[i + 1];
  if (next) {
    const via = p.clubIds.filter((c) => next.clubIds.includes(c));
    console.log(`           ${linkColour(p, next)}${via.length ? `  via ${via.join(', ')}` : ''}`);
  }
});
console.log('\nanswers available per blank: ' + answerCounts.join(', '));

if (outId) {
  const puzzle = {
    id: outId,
    mode: MODE,
    slots: line.map((p, i) => (i % 2 === 0 ? p.id : null)),
    referenceSolution: line.map((p) => p.id),
  };
  await mkdir('content/chains', { recursive: true });
  await writeFile(`content/chains/${outId}.json`, JSON.stringify(puzzle, null, 2));
  console.log(`\nwrote content/chains/${outId}.json`);
}
