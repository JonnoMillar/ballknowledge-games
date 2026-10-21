// Fetch 24 months of enwiki pageviews for every pool player (and, for Spoofed, the clubs of
// its candidates), resolving redirects first. Shared data: Spoofed reads the title-keyed file
// at generation time; Steps reads data/player-views.json (QID -> views) at runtime.
// Usage: node scripts/fetch-views.mjs   (resumable; ~1 h cold for the whole pool, Wikimedia throttles)
// The window stays Oct 2023-Sep 2025 so cached and new numbers are comparable; move all of it at once.
import fs from 'node:fs';
const OUT = 'data/enwiki-views.json';
const RED = 'data/enwiki-views.redirects.json';
const BY_ID = 'data/player-views.json';
const pool = JSON.parse(fs.readFileSync('data/pool.json','utf8'));
const car = JSON.parse(fs.readFileSync('data/careers.json','utf8')).players;
const cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT,'utf8')) : {};
const UA = 'ChainFootballGame/0.1 (jonno@m1llar.com) prototype-research';
// A player's English page is Wikidata's enwiki sitelink. The careers title is a guess from the
// name and can land on a disambiguation page ("Rodri": 34k views, not Rodri's millions) or on
// nothing ("Pepe (footballer, born February 1983)"); it is only the fallback.
const TITLES = 'data/enwiki-titles.json';
const enTitle = fs.existsSync(TITLES) ? JSON.parse(fs.readFileSync(TITLES,'utf8')) : {};
const unknown = pool.map(p => p.id).filter(q => !(q in enTitle));
for (let k = 0; k < unknown.length; k += 50) {
  const batch = unknown.slice(k, k + 50);
  const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=enwiki&ids=' + batch.join('|');
  const j = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }).then(r => r.json()).catch(() => null);
  if (!j?.entities) continue;
  for (const q of batch) if (j.entities[q]) enTitle[q] = j.entities[q].sitelinks?.enwiki?.title ?? null;
  if (k % 1000 === 0) console.log('wikidata titles', k, 'of', unknown.length);
}
fs.writeFileSync(TITLES, JSON.stringify(enTitle));
const titleOf = (q) => (q in enTitle ? enTitle[q] ?? undefined : car[q]?.title);
const titles = new Set();
for (const p of pool) {
  const c = car[p.id];
  const t = titleOf(p.id);
  if (t) titles.add(t);
  if (!c) continue;
  // Spoofed's candidates also need their clubs' views.
  if (p.fame.value >= 30 && (c.stints||[]).length >= 4) for (const s of c.stints) if (s.title) titles.add(s.title);
}
// Redirects collect almost no views of their own: resolve every title to its page first.
const redirect = fs.existsSync(RED) ? JSON.parse(fs.readFileSync(RED,'utf8')) : {};
const unresolved = [...titles].filter(t => !(t in redirect));
for (let k = 0; k < unresolved.length; k += 50) {
  const batch = unresolved.slice(k, k + 50);
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=' + encodeURIComponent(batch.join('|'));
  const j = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }).then(r => r.json()).catch(() => null);
  if (!j) continue;
  const norm = new Map((j.query?.normalized || []).map(x => [x.from, x.to]));
  const red = new Map((j.query?.redirects || []).map(x => [x.from, x.to]));
  for (const t of batch) { const n = norm.get(t) ?? t; redirect[t] = red.get(n) ?? n; }
}
fs.writeFileSync(RED, JSON.stringify(redirect));
console.log('redirected', Object.entries(redirect).filter(([a, b]) => a !== b).length);
for (const t of titles) if (redirect[t] && redirect[t] !== t) { titles.add(redirect[t]); delete cache[t]; }
const todo = [...titles].filter(t => !(t in cache) && (!redirect[t] || redirect[t] === t));
console.log('titles', titles.size, 'todo', todo.length);
async function one(t) {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(t.replace(/ /g,'_'))}/monthly/2023100100/2025093000`;
  for (let a = 0; a < 4; a++) {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }).catch(() => null);
    if (r && r.status === 404) return 0;
    if (r && r.ok) { const j = await r.json(); return j.items.reduce((n, i) => n + i.views, 0); }
    await new Promise(res => setTimeout(res, 1500 * (a + 1)));
  }
  return null;
}
let i = 0, done = 0;
async function worker() { while (i < todo.length) { const t = todo[i++]; const v = await one(t); if (v !== null) cache[t] = v; if (++done % 500 === 0) { fs.writeFileSync(OUT, JSON.stringify(cache)); console.log(done); } } }
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(OUT, JSON.stringify(cache));
console.log('done', Object.keys(cache).length, 'failed', todo.filter(t => !(t in cache)).length);
// A page moved inside the window kept its views under the old title, now a redirect into it
// ("Rodri (footballer, born 1996)" became "Rodri": 34k views on the new title). For players far
// below what their sitelinks predict (FIT_A, FIT_B in games/step/lib/rules.ts), add the views
// of every redirect into their page.
const INTO = 'data/enwiki-views.into.json';
const into = fs.existsSync(INTO) ? JSON.parse(fs.readFileSync(INTO,'utf8')) : {};
const pageOf = (q) => { const t = titleOf(q); return t === undefined ? undefined : redirect[t] ?? t; };
const low = [...new Set(pool.filter(p => {
  const t = pageOf(p.id);
  return t !== undefined && t in cache && p.fame.value >= 50 && cache[t] < 10 ** (2.943 + 0.0425 * p.fame.value) / 10;
}).map(p => pageOf(p.id)))].filter(t => !(t in into));
for (const t of low) {
  const titlesIn = [];
  let cont = '';
  for (let n = 0; n < 10; n++) {
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=redirects&rdlimit=max&titles=' + encodeURIComponent(t) + cont;
    const j = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }).then(r => r.json()).catch(() => null);
    if (!j) break;
    for (const pg of Object.values(j.query?.pages ?? {})) for (const r of pg.redirects ?? []) titlesIn.push(r.title);
    if (!j.continue) { into[t] = titlesIn; break; }
    cont = '&rdcontinue=' + encodeURIComponent(j.continue.rdcontinue);
  }
}
fs.writeFileSync(INTO, JSON.stringify(into));
const todoIn = [...new Set(Object.values(into).flat())].filter(t => !(t in cache));
console.log('pages with redirects summed', Object.keys(into).length, 'redirect titles to fetch', todoIn.length);
let k = 0;
async function workerIn() { while (k < todoIn.length) { const t = todoIn[k++]; const v = await one(t); if (v !== null) cache[t] = v; } }
await Promise.all(Array.from({ length: 6 }, workerIn));
fs.writeFileSync(OUT, JSON.stringify(cache));

// What the game server reads: one number per player, no titles.
// A move the other way leaves the views on the old title, now a disambiguation page ("Luis Suárez"
// became "Luis Suárez (Uruguayan footballer)"): the careers title, cached from before, holds them.
// So a player's views are the larger of the two readings.
const byId = {};
for (const p of pool) {
  const t = pageOf(p.id);
  const now = t === undefined ? undefined : cache[t] === undefined ? undefined : cache[t] + (into[t] ?? []).reduce((n, r) => n + (cache[r] ?? 0), 0);
  const ct = car[p.id]?.title;
  const before = ct === undefined ? undefined : cache[redirect[ct] ?? ct];
  const v = now === undefined ? before : before === undefined ? now : Math.max(now, before);
  if (v !== undefined) byId[p.id] = v;
}
fs.writeFileSync(BY_ID, JSON.stringify(byId));
console.log('players with views', Object.keys(byId).length, 'of', pool.length);
