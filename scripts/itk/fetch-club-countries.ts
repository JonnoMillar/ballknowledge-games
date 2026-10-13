/**
 * The country (Wikidata P17) of every club the ITK known-club rule could
 * accept: those with enough enwiki views. Rerun after the views or the pool
 * change. Usage: tsx scripts/itk/fetch-club-countries.ts
 */
import { writeFileSync } from 'node:fs';
import { buildWorld, RULES } from '../../games/itk/lib/world';
import { COUNTRIES, readInputs } from './inputs';

const UA = 'ChainFootballGame/0.1 (jonno@m1llar.com) itk';
const inputs = readInputs();
const world = buildWorld({ ...inputs, countries: {} });
const qs = [...new Set(Object.values(inputs.careers).flatMap((c) => (c?.stints ?? []).flatMap((s) => (s.q ? [s.q] : []))))]
  .filter((q) => /^Q\d+$/.test(q) && world.clubViews(q) >= RULES.clubKnown)
  .sort();

const out: Record<string, string[]> = {};
for (let i = 0; i < qs.length; i += 200) {
  const query = `SELECT ?c ?n WHERE { VALUES ?c { ${qs.slice(i, i + 200).map((q) => `wd:${q}`).join(' ')} } ?c wdt:P17 ?n }`;
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const j = (await res.json()) as { results: { bindings: { c: { value: string }; n: { value: string } }[] } };
  for (const b of j.results.bindings) (out[b.c.value.split('/').pop()!] ??= []).push(b.n.value.split('/').pop()!);
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, [...new Set(v)].sort()]));
writeFileSync(COUNTRIES, `${JSON.stringify(sorted, null, 0)}\n`);
console.log(`${qs.length} clubs, ${Object.keys(sorted).length} with a country → ${COUNTRIES}`);
