// Fetch 24 months of enwiki pageviews for pool players and their clubs, resolving redirects first.
// Usage: node scripts/itk/fetch-views.mjs games/itk/data/enwiki-views.json   (resumable; ~30 min cold, Wikimedia throttles)
import fs from 'node:fs';
const OUT = process.argv[2];
const pool = JSON.parse(fs.readFileSync('data/pool.json','utf8'));
const car = JSON.parse(fs.readFileSync('data/careers.json','utf8')).players;
const cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT,'utf8')) : {};
const titles = new Set();
for (const p of pool) { const c = car[p.id]; if (p.fame.value < 30 || !c || (c.stints||[]).length < 4) continue; titles.add(c.title); for (const s of c.stints) if (s.title) titles.add(s.title); }
// Redirects collect almost no views of their own: resolve every title to its page first.
const RED = OUT.replace(/\.json$/, '.redirects.json');
const redirect = fs.existsSync(RED) ? JSON.parse(fs.readFileSync(RED,'utf8')) : {};
const unresolved = [...titles].filter(t => !(t in redirect));
for (let k = 0; k < unresolved.length; k += 50) {
  const batch = unresolved.slice(k, k + 50);
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=' + encodeURIComponent(batch.join('|'));
  const j = await fetch(url, { headers: { 'user-agent': 'ChainFootballGame/0.1 (jonno@m1llar.com) prototype-research' } }).then(r => r.json()).catch(() => null);
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
const UA = 'ChainFootballGame/0.1 (jonno@m1llar.com) prototype-research';
async function one(t) {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(t.replace(/ /g,'_'))}/monthly/2023100100/2025093000`;
  for (let a = 0; a < 4; a++) {
    const r = await fetch(url, { headers: { 'user-agent': UA } }).catch(() => null);
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
