// Builds index.html: per player, today's photo vs the two treatments, then the fallback kit cards.
// Usage: node .scratch/photo-test/build.js
const fs = require('fs');
const path = require('path');
const D = __dirname;
const players = JSON.parse(fs.readFileSync(path.join(D, 'players.json'), 'utf8')).slice(0, 12);
const status = (id) => { try { return JSON.parse(fs.readFileSync(path.join(D, 'out', `${id}.json`), 'utf8')); } catch { return null; } };
const done = (id) => status(id)?.ok === true;
const surname = (n) => n.split(' ').slice(-1)[0].toUpperCase();

const sticker = (name, colour, inner, cls = '') =>
  `<figure class="st ${cls}"><div class="st__photo" style="--g:${colour}">${inner}</div><figcaption class="st__plate">${name}</figcaption></figure>`;

// The figure is one good cutout, blacked out; on a dark club colour it turns light so it never disappears.
const dark = (hex) => { const n = parseInt(hex.slice(1), 16); const l = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; return l < 0.3; };
const kit = (p, crest = true) => sticker(surname(p.name), p.colour, `
  <span class="kit" style="--fig:${dark(p.colour) ? 'rgba(255,255,255,0.82)' : 'rgba(20,18,16,0.82)'}"></span>
  ${crest ? `<img class="kit__crest" src="../../public/badges/${p.club}.png" alt="">` : ''}`, 'st--kit');

const cands = (id) => { try { return JSON.parse(fs.readFileSync(path.join(D, 'cand', `${id}.json`), 'utf8')); } catch { return []; } };
const rows = players.map((p) => {
  const st = status(p.id);
  const all = cands(p.id);
  const usable = all.filter((c) => c.score > 0);
  const strip = `<div class="cands"><span class="lab">Considered: ${all.length} in-era photos, ${usable.length} usable. Best first.</span><div class="cands__row">${usable.slice(0, 5).map((c, i) => `<figure class="cand ${c.file === st?.file ? 'is-pick' : ''}"><img src="${c.local}" alt="" title="${c.file.replace(/"/g, '')}: ${c.why}">${c.file === st?.file ? '<figcaption>Picked</figcaption>' : ''}</figure>`).join('')}</div></div>`;
  const cell = (k) => st?.ok
    ? sticker(surname(p.name), p.colour, `<img class="cut" src="out/${p.id}.${k}.png" alt="">`)
    : kit(p);
  const note = !st ? 'not processed' : st.ok ? `source ${st.source.join('×')}, face ${st.face}px` : `photo rejected (${st.why}): kit card`;
  return `<section class="trio">
    <h2>${p.name} <small>${p.clubName}, photo ${p.year} · ${note}</small></h2>
    <div class="trio__row">
      <div><span class="lab">Today</span>${sticker(surname(p.name), p.colour, `<img class="cover" src="raw/${p.id}.jpg" alt="">`)}</div>
      <div><span class="lab">A · Natural</span>${cell('natural')}</div>
      <div><span class="lab">B · Print</span>${cell('print')}</div>
    </div>
    ${strip}
  </section>`;
}).join('');

const neutral = { name: 'Unknown Player', colour: '#4d4133', club: players[0].club };
const kits = [...players.slice(0, 5), neutral].map((p) => p === neutral ? kit({ ...p, name: 'Colourless' }, false) : kit(p)).join('');

fs.writeFileSync(path.join(D, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Photo test</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@700;900&family=Libre+Franklin:wght@400;600&display=swap">
<style>
:root { --page:#f1ede6; --ink:#141210; --muted:#6d655b; --sticker:#fff; }
* { box-sizing: border-box; }
body { margin:0; background:var(--page); color:var(--ink); font:15px/1.45 'Libre Franklin', system-ui, sans-serif; padding:24px 16px 60px; }
h1 { font:900 40px/1 'Big Shoulders', Impact, sans-serif; text-transform:uppercase; margin:0 0 6px; }
.intro { max-width:760px; color:var(--muted); margin:0 0 24px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(330px, 1fr)); gap:28px 24px; }
.trio h2 { font:700 20px/1.1 'Big Shoulders', Impact, sans-serif; text-transform:uppercase; margin:0 0 8px; }
.trio h2 small { display:block; font:400 12px 'Libre Franklin', sans-serif; text-transform:none; color:var(--muted); }
.trio__row { display:flex; gap:10px; }
.lab { display:block; font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
.st { margin:0; width:100px; padding:4px 4px 0; background:var(--sticker); border-radius:2px; box-shadow:0 1px 0 rgba(20,18,16,.06), 0 2px 6px rgba(20,18,16,.12); }
.st__photo { position:relative; overflow:hidden; aspect-ratio:4/5; background:var(--g); }
.st__photo .cover { width:100%; height:100%; object-fit:cover; object-position:50% 20%; display:block; }
.st__photo .cut { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:50% 100%; filter:drop-shadow(0 2px 3px rgba(0,0,0,.25)); }
.st__plate { font:700 14px/1 'Big Shoulders', Impact, sans-serif; text-transform:uppercase; padding:6px 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.miss { width:100px; aspect-ratio:4/5; display:grid; place-items:center; margin:0; font-size:12px; color:var(--muted); border:1.5px dashed #b9b0a4; }
h3 { font:900 28px/1 'Big Shoulders', Impact, sans-serif; text-transform:uppercase; margin:44px 0 6px; }
.cands { margin-top:10px; } .cands__row { display:flex; gap:6px; } .cand { margin:0; position:relative; } .cand img { width:52px; height:65px; object-fit:cover; object-position:50% 20%; display:block; border:2px solid transparent; } .cand.is-pick img { border-color:var(--ink); } .cand figcaption { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
.kits { display:flex; flex-wrap:wrap; gap:14px; }
.kits .st--kit { width:130px; }
.kit { position:absolute; inset:0; background:var(--fig); -webkit-mask:url(silhouette.png) 50% 100% / 100% auto no-repeat; mask:url(silhouette.png) 50% 100% / 100% auto no-repeat; }
.kit__crest { position:absolute; right:5%; top:4%; width:24%; aspect-ratio:1; object-fit:contain; padding:4%; background:rgba(255,255,255,.94); border-radius:50%; filter:drop-shadow(0 1px 1px rgba(0,0,0,.25)); }
</style></head><body>
<h1>Photo test</h1>
<p class="intro"><b>Today</b> is the photo production picks now (the first in-era file in the player's Commons category, unjudged): the Commons photo as it is. Below each row, the new picker's candidates: every in-era photo, ranked by face size, one person only, enough body below the face, sharpness. <b>A</b> cuts the picked photo out, crops every face to one box and keeps natural colour. <b>B</b> does the same, then prints it in two tones (ink to paper), which hides quality differences. Both sit on the club's colour, as givens do. Photos: Wikimedia Commons (CC BY / BY-SA).</p>
<div class="grid">${rows}</div>
<h3>Fallback kit card</h3>
<p class="intro">For anyone without a good photo: one real cutout blacked out (light on a dark club colour), the club colour behind, the real crest on the chest. The last one is a club with no colour on file.</p>
<div class="kits">${kits}</div>
</body></html>`);
console.log('written', players.filter((p) => done(p.id)).length, 'of', players.length, 'processed');
