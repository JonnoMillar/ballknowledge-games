import { readFile, readdir, writeFile } from 'node:fs/promises';
import type { Player, Spell } from '../src/lib/chemistry/types';
import type { ClubRecord } from '../src/lib/clubs';
import type { ChainPuzzle } from '../src/lib/chain/types';
import { chainFieldFor, sidesOf, neighboursOf } from '../src/lib/chain/score';
import { factFame } from '../src/lib/fame/spell';
import type { Careers } from './fetch-careers';

/**
 * Merge English Wikipedia's infobox careers (data/careers.json, from
 * scripts/fetch-careers.ts) into the pool.
 *
 * Usage: tsx scripts/merge-careers.ts [--write]
 *
 * Without --write nothing is touched: it prints what the merge would add
 * and re-runs the daily boards' promise (tests/content/chains.test.ts:
 * one answer in reach per plate, a cliff behind it) against the merged
 * pool, naming any board the new clubs would break. With --write it
 * rewrites data/pool.json and adds name-only records to data/clubs.json
 * for clubs the pool had never seen.
 *
 * UNION ONLY. A club the infobox names is added; nothing Wikidata had is
 * removed. A stint Wikidata left open-ended ("at Napoli since 2015") is
 * closed with the infobox's end year, and a stint with no appearance count
 * takes the infobox's caps. The infobox is the better-kept record of a
 * senior career, but it omits things Wikidata has (short loans, youth
 * sides), and a link that should not exist is a quieter error than one
 * that should and does not.
 */
const WRITE = process.argv.includes('--write');
const FETCH_YEAR = new Date().getFullYear();

async function main() {
  const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
  const careers = JSON.parse(await readFile('data/careers.json', 'utf8')) as Careers;
  const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;

  let playersTouched = 0, clubsAdded = 0, spellsClosed = 0, appsFilled = 0, positionsFilled = 0;
  const newClubs = new Map<string, string>();

  const merged: Player[] = pool.map((p0) => {
    const career = careers.players[p0.id];
    // Positions only where Wikidata gave no class (no P413, or one that is
    // ambiguous or from another sport; see POSITION_CLASS). Where it did, it
    // stands: the infobox is not the better record of a position.
    const p = p0.positions.length === 0 && career?.positions?.length
      ? (positionsFilled++, { ...p0, positions: career.positions })
      : p0;
    if (!career || career.stints.length === 0) return p;

    // One entry per club, summed over every stint there.
    const byClub = new Map<string, { apps: number | null; from: number | null; to: number | null; title: string }>();
    for (const s of career.stints) {
      if (!s.q) continue;
      const e = byClub.get(s.q) ?? { apps: null, from: null, to: null, title: s.title };
      if (s.apps !== undefined) e.apps = (e.apps ?? 0) + s.apps;
      if (s.from !== undefined) e.from = e.from === null ? s.from : Math.min(e.from, s.from);
      // An open stint ("2023–") ends at the fetch year, as Wikidata's do.
      const to = s.to ?? (s.from !== undefined ? FETCH_YEAR : undefined);
      if (to !== undefined) e.to = e.to === null ? to : Math.max(e.to, to);
      byClub.set(s.q, e);
    }

    const clubIds = [...p.clubIds];
    const spells: Record<string, Spell> = { ...(p.spells ?? {}) };
    let touched = false;
    for (const [q, e] of byClub) {
      const years = e.from !== null && e.to !== null ? Math.max(1, e.to - e.from) : null;
      if (!clubIds.includes(q)) {
        clubIds.push(q);
        spells[q] = [e.apps, years, e.to];
        clubsAdded++;
        touched = true;
        if (!clubs[q]) newClubs.set(q, e.title);
        continue;
      }
      const old = spells[q];
      if (!old) continue;
      let [apps, yrs, last] = old;
      if (apps === null && e.apps !== null) { apps = e.apps; appsFilled++; touched = true; }
      // Wikidata's "still there" is the fetch year; the infobox knows better.
      if (last === FETCH_YEAR && e.to !== null && e.to < FETCH_YEAR) { last = e.to; yrs = years ?? yrs; spellsClosed++; touched = true; }
      spells[q] = [apps, yrs, last];
    }
    if (touched || p !== p0) playersTouched++;
    return { ...p, clubIds, spells };
  });

  console.log(`${playersTouched} players touched: ${clubsAdded} clubs added, ${spellsClosed} open-ended spells closed, ${appsFilled} appearance counts filled, ${positionsFilled} positions filled, ${newClubs.size} clubs new to clubs.json.`);

  // The daily boards' promise, re-run on the merged pool.
  const byId = new Map(merged.map((p) => [p.id, p]));
  const files = (await readdir('content/chains')).filter((f) => /^\d{3}\.json$/.test(f)).sort();
  const broken: string[] = [];
  let dailies = 0;
  for (const f of files) {
    const chain = JSON.parse(await readFile(`content/chains/${f}`, 'utf8')) as ChainPuzzle;
    // Dailies only: not the ladder, not Deep Cuts, not a retired board.
    if (chain.difficulty !== undefined || chain.deep || chain.until) continue;
    dailies++;
    const mode = chain.mode ?? 'clubs';
    const ref = chain.referenceSolution!;
    const prescribed = chain.prescribedLinks ?? {};
    const problems: string[] = [];
    chain.slots.forEach((id, i) => {
      if (id !== null) return;
      const field = chainFieldFor(i, chain.slots, merged, byId, mode, chain.prescribedLinks, chain.closed, chain.clues);
      const sides = sidesOf(i, chain.slots, byId, chain.prescribedLinks, chain.closed);
      const ranked = field.map((p) => ({ p, f: factFame(p, sides, mode) })).sort((a, b) => b.f - a.f);
      if (ranked[0]?.p.id !== ref[i]) problems.push(`slot ${i}: ${ranked[0]?.p.name ?? 'nobody'} now tops the plate`);
      else if (ranked[0]!.f < 50) problems.push(`slot ${i}: answer out of reach`);
      const badged = neighboursOf(i, chain.slots.length, chain.closed).some(({ link }) => prescribed[link] !== undefined);
      if (chain.clues?.[i] !== undefined || badged) {
        if (ranked[1] && ranked[1].f >= 35) problems.push(`slot ${i}: ${ranked[1].p.name} is a second answer in reach (${ranked[1].f.toFixed(0)})`);
      } else if (ranked.filter((r) => r.f >= 50).length > 5) problems.push(`slot ${i}: too many fit`);
    });
    if (problems.length) broken.push(`${chain.id}: ${problems.join('; ')}`);
  }
  console.log(broken.length === 0
    ? `All ${dailies} daily boards keep their promise on the merged pool.`
    : `${broken.length} of ${dailies} daily boards would break:\n  ${broken.join('\n  ')}`);

  if (!WRITE) { console.log('\nDry run. Pass --write to rewrite data/pool.json and data/clubs.json.'); return; }
  for (const [q, name] of newClubs) clubs[q] = { name };
  await writeFile('data/pool.json', JSON.stringify(merged));
  await writeFile('data/clubs.json', JSON.stringify(clubs, null, 0));
  console.log('Written.');
}

main().catch((e) => { console.error(e); process.exit(1); });
