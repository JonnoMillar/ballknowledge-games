import { writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { sportNationQuery, nationalTeamQuery } from '../src/pipeline/queries';
import { pendingIds } from './pending-ids';

const { ids, done } = await pendingIds<string>('data/raw/_sportnation.json');
const CHUNK = 400;

// Pass 1 — national teams, decided by APPEARANCES.
//
// Neither labels nor types are reliable here. Labels vanish under batching, and
// Wikidata types the Netherlands U19 and U20 sides as BOTH a youth team and a
// plain "national association football team" — so a type test counts them as
// senior and leaves Hakim Ziyech Dutch.
//
// Caps settle it cleanly. Ziyech: Morocco 64, Netherlands U20 3, U19 1. The
// same rule fixes every switcher — Zaha (Ivory Coast over 2 England friendlies),
// Rice (England over 3 for Ireland) — without special-casing any of them.
// Youth-typed teams are dropped first; ties break on the later spell.
const YOUTH_TYPES = new Set([
  'Q6979740', 'Q21945604', 'Q23759293', 'Q23847779', 'Q23901123',
  'Q23901137', 'Q23904671', 'Q23904672', 'Q23904673', 'Q67608976',
  'Q45053817', 'Q47460286',   // secondary/B side, and beach soccer
]);

interface Cap { country: string; apps: number; start: number; youth: boolean }
const caps = new Map<string, Map<string, Cap>>();   // player -> team -> cap

for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await runQuery(nationalTeamQuery(ids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const p = b['player']?.value.split('/').pop();
    const c = b['country']?.value.split('/').pop();
    const type = b['type']?.value.split('/').pop();
    if (!p || !c || !type) continue;
    const key = `${c}:${b['apps']?.value ?? ''}:${b['start']?.value ?? ''}`;
    if (!caps.has(p)) caps.set(p, new Map());
    const existing = caps.get(p)!.get(key);
    const cap: Cap = {
      country: c,
      apps: Number(b['apps']?.value ?? 0),
      start: Number(b['start']?.value?.slice(0, 4) ?? 0),
      // A team carrying ANY youth type is a youth team, whatever else it says.
      youth: (existing?.youth ?? false) || YOUTH_TYPES.has(type),
    };
    caps.get(p)!.set(key, cap);
  }
  if (i % 2400 === 0) console.log(`  national teams ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}

const senior: Record<string, string> = {};
const youth: Record<string, string> = {};
for (const [p, teams] of caps) {
  const all = [...teams.values()];
  const pick = (xs: Cap[]) =>
    xs.sort((a, b) => b.apps - a.apps || b.start - a.start)[0]?.country;
  const s = pick(all.filter((c) => !c.youth));
  if (s) senior[p] = s;
  else {
    const y = pick(all);
    if (y) youth[p] = y;
  }
}
console.log(`  senior caps: ${Object.keys(senior).length}, youth only: ${Object.keys(youth).length}`);

// Pass 2 — P1532, for anyone with no caps at all. Ambiguous for dual nationals,
// which is exactly why it is the fallback rather than the source.
const p1532: Record<string, string> = {};
for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await runQuery(sportNationQuery(ids.slice(i, i + CHUNK)));
  for (const b of res.results.bindings) {
    const p = b['player']?.value.split('/').pop();
    const s = b['sport']?.value.split('/').pop();
    if (p && s && !p1532[p]) p1532[p] = s;
  }
  if (i % 2400 === 0) console.log(`  P1532 ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
}

const out: Record<string, string> = { ...done };
for (const id of ids) {
  const v = senior[id] ?? youth[id] ?? p1532[id];
  if (v) out[id] = v;
}
await writeFile('data/raw/_sportnation.json', JSON.stringify(out));
console.log(`\n${Object.keys(out).length} of ${ids.length} resolved`);
console.log(`  from senior caps ${Object.keys(senior).length} · youth ${Object.keys(youth).length} · P1532 fallback ${Object.keys(out).length - Object.keys(senior).length - Object.keys(youth).filter((k) => !senior[k]).length}`);
