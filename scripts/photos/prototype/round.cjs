// Builds round.html: per player, up to 6 usable candidates in shuffled order (our ranking hidden,
// so Jonno's picks measure it honestly). Tap a photo to pick it, or "None good".
// Usage: node .scratch/photo-test/round.cjs round1.json
const fs = require('fs');
const path = require('path');
const D = __dirname;
const players = JSON.parse(fs.readFileSync(path.join(D, process.argv[2] ?? 'round1.json'), 'utf8'));
const seeded = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507)) >>> 0) / 4294967296; };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const rows = players.map((p) => {
  let cands = [];
  try { cands = JSON.parse(fs.readFileSync(path.join(D, 'cand', `${p.id}.json`), 'utf8')).filter((c) => c.score > 0).slice(0, 6); } catch {}
  const r = seeded(p.id);
  const shown = cands.map((c) => [r(), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  return `<section class="pl" data-id="${p.id}">
  <h2>${esc(p.name)} <small>${esc(p.clubName ?? '')}</small></h2>
  <div class="opts">${shown.map((c) => `<button type="button" class="opt" data-file="${esc(c.file)}" title="${esc(c.file)} (${c.year})"><img src="${c.local}" alt="" loading="lazy"><span>${c.year}</span></button>`).join('')}
    <button type="button" class="opt opt--none" data-file="">None good</button></div>
</section>`;
}).join('\n');

fs.writeFileSync(path.join(D, 'round.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Photo picks</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@700;900&family=Libre+Franklin:wght@400;600&display=swap">
<style>
:root { --page:#f1ede6; --ink:#141210; --muted:#6d655b; }
* { box-sizing:border-box; }
body { margin:0; background:var(--page); color:var(--ink); font:15px/1.45 'Libre Franklin', system-ui, sans-serif; padding:20px 16px 80px; }
h1 { font:900 36px/1 'Big Shoulders', Impact, sans-serif; text-transform:uppercase; margin:0 0 6px; }
.intro { color:var(--muted); max-width:680px; margin:0 0 8px; }
.count { position:sticky; top:0; background:var(--page); padding:8px 0; font-weight:600; z-index:1; }
.pl { margin:22px 0; }
.pl h2 { font:700 22px/1 'Big Shoulders', Impact, sans-serif; text-transform:uppercase; margin:0 0 8px; }
.pl h2 small { font:400 13px 'Libre Franklin', sans-serif; text-transform:none; color:var(--muted); }
.opts { display:flex; flex-wrap:wrap; gap:10px; }
.opt { appearance:none; padding:0; border:3px solid transparent; border-radius:6px; background:#fff; cursor:pointer; width:140px; text-align:left; font:inherit; position:relative; }
.opt img { display:block; width:100%; aspect-ratio:4/5; object-fit:contain; background:#e4dfd6; border-radius:3px 3px 0 0; }
.opt span { display:block; padding:4px 6px; font-size:12px; color:var(--muted); }
.opt--none { width:110px; min-height:80px; align-self:center; text-align:center; font-weight:600; border-color:#c9c1b5; }
.opt:hover { border-color:#8a8177; }
.opt.is-picked { border-color:var(--ink); }
.opt.is-picked::after { content:'Your pick'; position:absolute; top:6px; left:6px; background:var(--ink); color:#fff; font-size:11px; font-weight:600; padding:2px 6px; border-radius:3px; }
.opt--none.is-picked::after { content:'Picked'; }
</style></head><body>
<h1>Photo picks</h1>
<p class="intro">For each player, tap the photo you'd want on their sticker. Think face, in-era kit, quality. If none is good enough, tap None good. The order is shuffled, so you're not seeing our ranking. Saves as you go.</p>
<div class="count" id="count"></div>
${rows}
<script>
const done = new Set();
const total = document.querySelectorAll('.pl').length;
const count = () => { document.getElementById('count').textContent = done.size + ' of ' + total + ' picked'; };
function mark(sec, file) {
  sec.querySelectorAll('.opt').forEach((b) => b.classList.toggle('is-picked', b.dataset.file === (file ?? '')));
  done.add(sec.dataset.id); count();
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.opt'); if (!b) return;
  const sec = b.closest('.pl'); const file = b.dataset.file || null;
  const r = await fetch('/pick', { method: 'POST', body: JSON.stringify({ id: sec.dataset.id, file }) });
  if (r.ok) mark(sec, file); else alert('Could not save that pick');
});
fetch('/picks').then((r) => r.json()).then((p) => { for (const [id, f] of Object.entries(p)) { const s = document.querySelector('[data-id="' + id + '"]'); if (s) mark(s, f); } count(); });
</script>
</body></html>`);
console.log('round.html:', players.length, 'players');
