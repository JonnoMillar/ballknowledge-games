import { readFile } from 'node:fs/promises';
import { chainFieldFor, sidesOf } from '../src/lib/chain/score';
import { factFame, spellWeight } from '../src/lib/fame/spell';
import type { ChainPuzzle } from '../src/lib/chain/types';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Put the two rulers side by side on a real board.
 *
 * For every blank on a chain, list the field ranked the old way (plain fame)
 * and the new way (fame × the stint that carried the link), with the route
 * and its appearance counts, so a change in the score can be read as a
 * change in what the game now considers obscure — and argued with.
 *
 * Usage: tsx scripts/compare-rulers.ts <chainId> [top]
 *        tsx scripts/compare-rulers.ts pair <givenQid> <givenQid> [top]
 */
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, { name: string }>;
const clubName = new Map(Object.entries(clubs).map(([id, c]) => [id, c.name]));
const cn = (id: string) => clubName.get(id) ?? id;

let puzzle: ChainPuzzle;
let top = 12;
if (process.argv[2] === 'pair') {
  puzzle = { id: 'pair', mode: 'clubs', slots: [process.argv[3]!, null, process.argv[4]!] };
  top = Number(process.argv[5] ?? top);
} else {
  puzzle = JSON.parse(await readFile(`content/chains/${process.argv[2] ?? '006'}.json`, 'utf8'));
  top = Number(process.argv[3] ?? top);
}
const mode = puzzle.mode ?? 'chemistry';
const prescribed = puzzle.prescribedLinks ?? {};
const closed = puzzle.closed ?? false;

const spellAt = (p: Player, c: string) => {
  const s = p.spells?.[c];
  if (!s) return '?';
  return s[0] !== null ? `${s[0]} apps` : s[1] !== null ? `~${s[1]}y` : '?';
};

console.log(`chain ${puzzle.id} (${mode}${closed ? ', ring' : ''})`);
console.log('givens:', puzzle.slots.filter((s): s is string => s !== null).map((id) => pool.get(id)?.name).join(' · '));

puzzle.slots.forEach((given, i) => {
  if (given !== null) return;
  const field = chainFieldFor(i, puzzle.slots, players, pool, mode, prescribed, closed);
  const sides = sidesOf(i, puzzle.slots, pool, prescribed, closed);
  const fameOf = (p: Player) => factFame(p, sides, mode);

  const byFame = [...field].sort((a, b) => a.fame.value - b.fame.value);
  const byFact = [...field].sort((a, b) => fameOf(a) - fameOf(b));
  const oldRank = new Map(byFame.map((p, k) => [p.id, k + 1]));

  const route = (p: Player) => sides.map((s) => {
    const cs = s.club !== undefined ? [s.club] : p.clubIds.filter((c) => s.player.clubIds.includes(c));
    // Show the club the ruler actually credits: the easiest shared one.
    const best = cs.map((c) => ({ c, w: Math.min(spellWeight(p.spells?.[c]), spellWeight(s.player.spells?.[c])) }))
      .sort((a, b) => b.w - a.w)[0];
    if (!best) return `${s.player.name}: nation+league`;
    return `${cn(best.c)} (${p.name.split(' ').pop()} ${spellAt(p, best.c)} / ${s.player.name.split(' ').pop()} ${spellAt(s.player, best.c)})`;
  }).join(' | ');

  console.log(`\nslot ${i}: ${field.length} fit`);
  console.log(`  ${'#new'.padStart(4)} ${'#old'.padStart(4)}  ${'fame'.padStart(4)} ${'fact'.padStart(5)}  name                       route`);
  byFact.slice(0, top).forEach((p, k) => {
    console.log(
      `  ${String(k + 1).padStart(4)} ${String(oldRank.get(p.id)).padStart(4)}  ` +
      `${String(p.fame.value).padStart(4)} ${fameOf(p).toFixed(1).padStart(5)}  ${p.name.padEnd(26).slice(0, 26)} ${route(p)}`,
    );
  });
  // The famous names whose rank moved most.
  const movers = byFact.map((p, k) => ({ p, up: oldRank.get(p.id)! - (k + 1), k: k + 1 }))
    .filter((m) => m.up > 0 && m.p.fame.value >= 60).sort((a, b) => b.up - a.up).slice(0, 5);
  if (movers.length) {
    console.log('  famous names that climbed:');
    for (const m of movers) console.log(`    ${m.p.name} (fame ${m.p.fame.value}): #${oldRank.get(m.p.id)} → #${m.k}  via ${route(m.p)}`);
  }
});

