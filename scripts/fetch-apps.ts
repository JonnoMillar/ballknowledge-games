import { readFile, writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { clubAppsQuery } from '../src/pipeline/queries';
import type { Spell } from '../src/lib/chemistry/types';

/**
 * Appearances per club for every player in the pool -> data/raw/_apps.json.
 *
 * The obscurity score needs to know that Harry Kane's 13 games at Leicester
 * are not the same fact as his 317 at Tottenham. Wikidata holds that as a
 * P1350 qualifier on each club spell, and this pulls it the way
 * fetch-sport-nation pulls caps: a side file merged in by build-pool.
 *
 * Shape: playerId -> clubId -> [apps | null, years | null, last | null], where
 * `last` is the year the stint ended — or the year of this fetch when it is
 * still going, because "still there" is the most recent a stint can be. A
 * player with two spells at one club (loan, then permanent) has apps and
 * years summed and the later end kept.
 */
const ids = JSON.parse(await readFile('data/raw/_ids.json', 'utf8')) as string[];
const CHUNK = 400;
const FETCH_YEAR = new Date().getFullYear();

// Whole spells, keyed to dedupe the rows a SPARQL OPTIONAL can multiply.
const spells = new Map<string, Map<string, Map<string, { apps: number | null; years: number | null; last: number | null }>>>();

for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await runQuery(clubAppsQuery(ids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const p = b['player']?.value.split('/').pop();
    const c = b['club']?.value.split('/').pop();
    if (!p || !c) continue;
    const apps = b['apps'] ? Number(b['apps'].value) : null;
    const start = b['start'] ? Number(b['start'].value.slice(0, 4)) : null;
    const end = b['end'] ? Number(b['end'].value.slice(0, 4)) : null;
    // A stint that opened and closed in the same calendar year is still a
    // stint — half a season, not nothing.
    const years = start !== null && end !== null ? Math.max(1, end - start) : null;
    // Started and not ended is a current stint. Neither date is silence.
    const last = end ?? (start !== null ? FETCH_YEAR : null);
    const key = `${start ?? ''}:${end ?? ''}:${apps ?? ''}`;
    if (!spells.has(p)) spells.set(p, new Map());
    const clubs = spells.get(p)!;
    if (!clubs.has(c)) clubs.set(c, new Map());
    clubs.get(c)!.set(key, { apps, years, last });
  }
  if (i % 2400 === 0) console.log(`  apps ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}

const out: Record<string, Record<string, Spell>> = {};
let withApps = 0;
let total = 0;
for (const [p, clubs] of spells) {
  out[p] = {};
  for (const [c, stints] of clubs) {
    let apps: number | null = null;
    let years: number | null = null;
    let last: number | null = null;
    for (const s of stints.values()) {
      if (s.apps !== null) apps = (apps ?? 0) + s.apps;
      if (s.years !== null) years = (years ?? 0) + s.years;
      if (s.last !== null) last = Math.max(last ?? 0, s.last);
    }
    out[p]![c] = [apps, years, last];
    total++;
    if (apps !== null) withApps++;
  }
}
await writeFile('data/raw/_apps.json', JSON.stringify(out));
console.log(`\n${Object.keys(out).length} of ${ids.length} players, ${total} club spells, ${withApps} with an appearance count (${Math.round((100 * withApps) / total)}%)`);
