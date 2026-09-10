import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chainFieldFor } from '../src/lib/chain/score';
import type { ChainPuzzle } from '../src/lib/chain/types';
import type { Player } from '../src/lib/chemistry/types';
import type { ClubRecord } from '../src/lib/clubs';
import type { PortraitRecord } from '../src/lib/portraits';

/**
 * Render the shipped chains as SCOUTING SHEETS — the strand A design, one
 * artboard per board.
 *
 * Usage: tsx scripts/build-design-sheets.ts
 *
 * Writes design/Chain0NN.dc.html plus design/canvas.json, and pulls every
 * photo and crest it references into design/sheets/ at a size the canvas will
 * accept. Everything on the sheet is read from content/chains and data/, so a
 * regenerated board produces a regenerated sheet rather than a stale mock.
 */
const CHAINS = ['006', '007', '008'];
const DIR = 'design/sheets';
const run = promisify(execFile);

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;
const portraits = JSON.parse(await readFile('data/portraits.json', 'utf8')) as Record<string, PortraitRecord>;
const byId = new Map(pool.map((p) => [p.id, p]));

/**
 * Club colours, by hand.
 *
 * The extractor built earlier reads the dominant colour out of the crest PNG
 * and is about 75% right — it takes City's navy ring over the sky blue and
 * Barcelona's crest gold over the claret. At this many clubs, hand-checking is
 * both cheaper and correct, and a wrong colour is the most visible error on
 * the sheet.
 */
const COLOUR: Record<string, string> = {
  Q5794: '#003399', // Everton
  Q7156: '#A50044', // Barcelona
  Q10467: '#A50044', // Barcelona Atlètic
  Q2346842: '#A50044', // Barcelona C
  Q9616: '#034694', // Chelsea
  Q8682: '#FEBE10', // Real Madrid — the gold, since the shirt is white
  Q483020: '#004170', // Paris Saint-Germain
  Q8701: '#CB3524', // Atlético Madrid
  Q18656: '#DA291C', // Manchester United
  Q172567: '#000000', // Beşiktaş
  Q18741: '#132257', // Tottenham Hotspur
  Q704: '#143C8C', // Olympique Lyonnais
  Q51976: '#1D9053', // Werder Bremen
  Q1422: '#000000', // Juventus
  Q180305: '#E63329', // Monaco
  Q10315: '#0067B1', // Real Sociedad
  Q844271: '#8B1B3F', // Vissel Kobe
  Q18380286: '#C39E6D', // Los Angeles FC
  Q15214308: '#633492', // Orlando City
  Q16844931: '#F7B5CD', // Inter Miami
  Q216032: '#005BAC', // Genk
  Q185163: '#C8102E', // OGC Nice
  Q1191998: '#005BAC', // Emirates Club
};
const colour = (id: string) => COLOUR[id] ?? '#7a6a52';

/** The club a given is best known for — used for its single-colour ring. */
const SIGNATURE: Record<string, string> = {
  Q615: 'Q7156', // Messi — Barcelona
  Q73360: 'Q8682', // Courtois — Real Madrid
  Q43729: 'Q7156', // Iniesta — Barcelona
  Q1907: 'Q18741', // Lloris — Tottenham
  Q455462: 'Q8701', // Griezmann — Atlético
  Q129027: 'Q18656', // Pogba — Manchester United
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * What goes on the nameplate.
 *
 * Last word by default, which is right for most European names and wrong for
 * exactly the cases football cares about: Diego Ribas da Cunha is Diego, not
 * "da Cunha", and Marcelo Antônio Guedes Filho is Marcelo, not "Filho". The
 * proper fix is the alias data — and ZERO of the 11,741 players in the pool
 * carry an alias, which is a known pipeline gap. Until that is filled, the
 * names that appear on a shipped sheet are named here.
 */
const PLATE: Record<string, string> = {
  Q109428: 'DIEGO', // Diego Ribas da Cunha
  Q721804: 'MARCELO', // Marcelo Antônio Guedes Filho
  Q368441: 'JAMES', // James Rodríguez
  Q15113616: 'ANDRÉ SILVA', // distinguishing him from every other Silva
  Q10553748: 'DELE ALLI',
  Q18719633: 'BORRÉ', // Rafael Santos Borré
};
const plate = (p: Player) =>
  PLATE[p.id] ?? p.name.split(' ')[p.name.split(' ').length - 1]!.toUpperCase();

/**
 * Club names short enough for a caption. The regex handles the ordinary
 * suffixes; the map handles the ones it cannot, and "Real Madrid Club de
 * Fútbol and Everton" wrapping onto two lines is what prompted it.
 */
const SHORT: Record<string, string> = {
  Q8682: 'Real Madrid',
  Q483020: 'PSG',
  Q704: 'Lyon',
  Q18741: 'Tottenham',
  Q18656: 'Man United',
  Q8701: 'Atlético',
  Q51976: 'Werder Bremen',
  Q10467: 'Barcelona B',
  Q2346842: 'Barcelona C',
};
const shortClub = (id: string) => SHORT[id] ?? (clubs[id]?.name ?? id)
  .replace(/\s+(F\.?C\.?|C\.?F\.?|J\.?K\.?|S\.?K\.?)$/i, '')
  .replace(/^(FC|SV|AS|RC|SC)\s+/i, '');

/**
 * The two clubs that made a player fit, as a diagonal.
 *
 * The hairline is not decoration. Tottenham navy against Beşiktaş black, or
 * Barcelona claret against Everton blue, read as one solid dark border and the
 * split — the whole idea — disappears. A parchment-coloured line at the
 * boundary keeps it legible whatever two colours land next to each other.
 */
const split = (a: string, b: string) =>
  `linear-gradient(126deg, ${a} 0 calc(50% - 0.75px), #f7f2e6 calc(50% - 0.75px) calc(50% + 0.75px), ${b} calc(50% + 0.75px) 100%)`;

// ------------------------------------------------------------------- assets

await mkdir(DIR, { recursive: true });
const fetched = new Set<string>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retried, because a single dropped socket must not take the whole run with
 * it. This script threw `ECONNRESET` on its first image on its first run, and
 * without this it had nothing to show for the calls it had already made.
 */
async function grab(url: string, tries = 4): Promise<Buffer | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'RecallXI/0.1 (jonno@m1llar.com)' } });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      await sleep(900 * (i + 1));
    }
  }
  return null;
}

/** Pull a portrait down and shrink it: the canvas inlines every image as base64. */
async function photo(id: string): Promise<{ file: string; fit: 'cover' | 'contain' } | null> {
  const rec = portraits[id];
  if (!rec || rec.source === 'none' || !rec.url) return null;
  // A cutout is a transparent square with the whole player in it, so it is
  // shown WHOLE on the pale card. A press photo is cropped to the frame and
  // anchored high, because the head is what matters and Commons framing varies.
  const fit = rec.source === 'cutout' ? 'contain' : 'cover';
  // Only a cutout needs an alpha channel. Keeping press photos as PNG tripled
  // the heaviest assets for nothing — the whole document is inlined as base64
  // and republished on every save.
  const file = rec.source === 'cutout' ? `${id}.png` : `${id}.jpg`;
  if (!fetched.has(file)) {
    const body = await grab(rec.url);
    if (!body) { console.log(`    ! no image for ${id}`); return null; }
    const raw = `${DIR}/.raw-${id}`;
    await writeFile(raw, body);
    // Pillow, because the `convert` on PATH here is Windows' filesystem tool.
    await run('python', ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1])
keep_alpha = sys.argv[3] == 'png'
im = im.convert('RGBA' if keep_alpha else 'RGB')
im.thumbnail((240, 240), Image.LANCZOS)
if keep_alpha:
    # A cutout is flat kit colour against transparency, so a 128-entry palette
    # is indistinguishable from truecolour and an eighth of the bytes: 82 KB
    # to 11 KB on Messi. FASTOCTREE is the quantiser that keeps the alpha.
    im = im.quantize(colors=128, method=Image.FASTOCTREE)
    im.save(sys.argv[2], 'PNG', optimize=True)
else:
    im.save(sys.argv[2], 'JPEG', quality=82, optimize=True, progressive=True)
`, raw, `${DIR}/${file}`, rec.source === 'cutout' ? 'png' : 'jpg']);
    fetched.add(file);
  }
  return { file, fit };
}

async function crest(id: string): Promise<string | null> {
  const file = `${id}.png`;
  if (fetched.has(`crest-${file}`)) return file;
  try {
    await copyFile(`public/badges/${file}`, `${DIR}/${file}`);
    fetched.add(`crest-${file}`);
    return file;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------- cards

const ROT = [-1.2, 0.9, -0.6, 1.3, -0.9, 2.1, -1.6, 1.4, -2];

interface Card {
  photo: { file: string; fit: string } | null;
  crest: string | null;
  ring: string;
  name: string;
  label: string;
  accent?: boolean;
  n: number;
}

function cardHtml(c: Card, i: number): string {
  const inner = c.photo
    ? `<img class="base" src="${c.photo.file}" alt="" style="object-fit: ${c.photo.fit}; object-position: ${c.photo.fit === 'cover' ? '50% 18%' : '50% 50%'};">`
    // No era-correct picture exists for this player. An empty plate is the
    // honest answer; the ring and the crest still say who he is.
    : `<div class="noshot"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,16,0.3)" stroke-width="1.4"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"/></svg></div>`;
  return `
      <div style="width: 116px; display: flex; flex-direction: column; align-items: center; gap: 7px;">
        <div style="transform: rotate(${ROT[i % ROT.length]}deg); background: #fffdf7; padding: 5px 5px 0; box-shadow: 0 2px 0 rgba(26,20,16,0.14), 0 8px 16px rgba(26,20,16,0.18);">
          <div class="photo" style="width: 106px; height: 118px; background: ${c.ring};">
            ${inner}
            ${c.crest ? `<img class="crest" src="${c.crest}" alt="" width="22" height="22">` : ''}
          </div>
          <div style="width: 106px; display: flex; align-items: baseline; justify-content: space-between; padding: 5px 1px 7px;">
            <div class="narrow" style="font-size: 12px; font-weight: 700; letter-spacing: 0.02em;${c.accent ? ' color: #b3341f;' : ''}">${esc(c.name)}</div>
            <div class="slab" style="font-size: 15px; line-height: 1; color: rgba(26,20,16,0.42);">${c.n}</div>
          </div>
        </div>
        <div class="narrow" style="font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: ${c.accent ? '#b3341f' : '#7a6a52'};">${esc(c.label)}</div>
      </div>`;
}

function blankHtml(n: number, i: number): string {
  return `
      <div style="width: 116px; display: flex; flex-direction: column; align-items: center; gap: 7px;">
        <div style="transform: rotate(${ROT[i % ROT.length]}deg); background: #fffdf7; padding: 5px 5px 0; box-shadow: 0 2px 0 rgba(26,20,16,0.14), 0 8px 16px rgba(26,20,16,0.18);">
          <div style="width: 106px; height: 118px; border: 2px dashed rgba(179,52,31,0.5); background: #efe8d8; display: flex; align-items: center; justify-content: center;">
            <div class="slab" style="font-size: 40px; color: rgba(179,52,31,0.34); line-height: 1;">?</div>
          </div>
          <div style="width: 106px; display: flex; align-items: baseline; justify-content: space-between; padding: 5px 1px 7px;">
            <div class="narrow" style="font-size: 12px; font-weight: 700; letter-spacing: 0.02em; color: #b3341f;">TO FIND</div>
            <div class="slab" style="font-size: 15px; line-height: 1; color: rgba(26,20,16,0.42);">${n}</div>
          </div>
        </div>
        <div class="narrow" style="font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #b3341f;">Yours</div>
      </div>`;
}

/** An open joint: the rule is "some shared club", and which one is yours to find. */
const openJoint = () => `
      <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; padding-top: 44px;">
        <div style="width: 100%; height: 0; border-top: 2px dotted rgba(26,20,16,0.42);"></div>
        <div class="slab" style="font-size: 17px; color: rgba(26,20,16,0.34); line-height: 1.2;">?</div>
        <div class="narrow" style="font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: #7a6a52;">Any<br>shared club</div>
      </div>`;

/** The named joint: the rule is stated, and it is stricter than the mode's. */
const namedJoint = (badge: string | null, label: string) => `
      <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; padding-top: 40px;">
        <div style="width: 100%; height: 0; border-top: 2.5px solid #b3341f;"></div>
        ${badge ? `<img src="${badge}" alt="" width="30" height="30" style="object-fit: contain;">` : ''}
        <div class="narrow" style="font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; line-height: 1.25; color: #b3341f;">${esc(label)}</div>
      </div>`;

// -------------------------------------------------------------------- sheet

const GRADE_INK: Record<string, string> = { easy: '#2f6b3f', medium: '#a8791f', hard: '#b3341f' };

interface Pick { p: Player; via: string; gap: 'A' | 'B' | 'either'; deep: boolean }

async function sheet(id: string): Promise<{ file: string; height: number }> {
  const chain = JSON.parse(await readFile(`content/chains/${id}.json`, 'utf8')) as ChainPuzzle;
  const mode = chain.mode ?? 'chemistry';
  const named = chain.prescribedLinks![1]!;
  const left = byId.get(chain.slots[0]!)!;
  const right = byId.get(chain.slots[3]!)!;

  const xs = chainFieldFor(1, chain.slots, pool, byId, mode, chain.prescribedLinks);
  const ys = chainFieldFor(2, chain.slots, pool, byId, mode, chain.prescribedLinks);
  const inY = new Set(ys.map((p) => p.id));
  const answers = xs.length * ys.length - xs.filter((p) => inY.has(p.id)).length;

  const share = (a: Player, b: Player) => a.clubIds.filter((c) => b.clubIds.includes(c));
  const desc = (a: Player, b: Player) => b.fame.value - a.fame.value;

  // Five names, chosen to show the SHAPE of the field rather than a top five:
  // the player who fits either gap, the most findable on each side, and the
  // deepest on each side above the curation floor.
  const both = [...xs].filter((p) => inY.has(p.id)).sort(desc)[0];
  const used = new Set<string>(both ? [both.id] : []);
  const topOf = (ps: Player[]) => [...ps].sort(desc).find((p) => !used.has(p.id));
  // Deepest above the curation floor, preferring one we can actually show. An
  // empty plate is honest on a card the player picked; in the middle of the
  // reveal it just reads as a hole, and at this depth there are several
  // candidates within a point or two of each other.
  const deepOf = (ps: Player[]) => {
    const band = [...ps]
      .filter((p) => p.fame.value >= 30 && !used.has(p.id))
      .sort((a, b) => a.fame.value - b.fame.value);
    const shown = band.find((p) => portraits[p.id] && portraits[p.id]!.source !== 'none');
    return shown ?? band[0];
  };

  const picks: Pick[] = [];
  const add = (p: Player | undefined, gap: Pick['gap'], deep: boolean, against: Player) => {
    if (!p) return;
    used.add(p.id);
    picks.push({ p, via: share(p, against)[0] ?? named, gap, deep });
  };
  add(both, 'either', false, left);
  const tA = topOf(xs); add(tA, 'A', false, left);
  const tB = topOf(ys); add(tB, 'B', false, right);
  const dA = deepOf(xs); add(dA, 'A', true, left);
  const dB = deepOf(ys); add(dB, 'B', true, right);

  // ---- assets
  const namedBadge = await crest(named);
  const cards: string[] = [];
  const lc = SIGNATURE[left.id] ?? left.clubIds[0]!;
  const rc = SIGNATURE[right.id] ?? right.clubIds[0]!;
  cards.push(cardHtml({
    photo: await photo(left.id), crest: await crest(lc), ring: colour(lc),
    name: plate(left), label: 'Given', n: 1,
  }, 0));
  cards.push(openJoint());
  cards.push(blankHtml(2, 1));
  cards.push(namedJoint(namedBadge, shortClub(named)));
  cards.push(blankHtml(3, 2));
  cards.push(openJoint());
  cards.push(cardHtml({
    photo: await photo(right.id), crest: await crest(rc), ring: colour(rc),
    name: plate(right), label: 'Given', n: 4,
  }, 3));

  const frames: string[] = [];
  for (const [i, pick] of picks.entries()) {
    const shot = await photo(pick.p.id);
    const badge = await crest(pick.via);
    const a = colour(pick.via);
    const b = colour(named);
    const caption = pick.gap === 'either'
      ? `Fits <em>either</em> gap`
      : `${esc(shortClub(pick.via))} <em>and</em> ${esc(shortClub(named))}`;
    frames.push(`
      <div style="width: 132px; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative;">
        <svg width="15" height="15" viewBox="0 0 15 15" style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); z-index: 2;" aria-hidden="true">
          <circle cx="7.5" cy="7.5" r="6.5" fill="#a8791f"/>
          <circle cx="5.4" cy="5.4" r="2.1" fill="#e6cb8c"/>
        </svg>
        <div style="transform: rotate(${ROT[(i + 4) % ROT.length]}deg); background: #fffdf7; padding: 6px 6px 0; box-shadow: 0 2px 0 rgba(26,20,16,0.14), 0 9px 18px rgba(26,20,16,0.24);">
          <div class="photo" style="width: 120px; height: 128px; background: ${split(a, b)};">
            ${shot
              ? `<img class="base" src="${shot.file}" alt="" style="object-fit: ${shot.fit}; object-position: ${shot.fit === 'cover' ? '50% 18%' : '50% 50%'};">`
              : `<div class="noshot"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,16,0.3)" stroke-width="1.4"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"/></svg></div>`}
            ${badge ? `<img class="crest" src="${badge}" alt="" width="20" height="20">` : ''}
          </div>
          <div class="narrow" style="width: 120px; padding: 5px 0 6px; font-size: 12px; font-weight: 700; text-align: center;">${esc(plate(pick.p))}</div>
        </div>
        <div class="read" style="font-size: 11px; text-align: center; line-height: 1.35; color: #5c4e3c;">${caption}</div>
        ${pick.deep ? `<div class="narrow" style="font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; background: #1a1410; color: #f7f2e6; padding: 3px 8px;">Deep cut</div>` : ''}
      </div>`);
  }

  const grade = chain.difficulty ?? 'medium';
  const ink = GRADE_INK[grade]!;
  const entry = (() => {
    const top = (ps: Player[]) => [...ps].sort(desc).slice(0, 2);
    let best = 0;
    for (const x of top(xs)) for (const y of top(ys)) {
      if (x.id !== y.id) best = Math.max(best, Math.min(x.fame.value, y.fame.value));
    }
    return best;
  })();

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Archivo+Narrow:wght@500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap">
  <style>
    /* No reset ships with a .dc.html: without this the padded root
       measures wider than its frame and the canvas clips it. */
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; }
    a { color: #a8791f; } a:hover { color: #7d5a14; }
    .slab { font-family: 'Alfa Slab One', Georgia, serif; }
    .read { font-family: 'Newsreader', Georgia, serif; }
    .narrow { font-family: 'Archivo Narrow', 'Helvetica Neue', sans-serif; }

    /* Cheap four-colour print never quite registers. One pixel of cyan one
       way and magenta the other is the artefact of every old programme and
       sticker album, and it is far more specific than a halftone screen. */
    .misreg { text-shadow: 1.2px 0 rgba(0,170,205,0.42), -1.2px 0 rgba(205,0,120,0.34); }
    .lean { display: inline-block; transform: skewX(-8deg); }

    /* The two clubs that made this player fit, as a thin ring around the
       photo rather than laid over it. The container's background IS the
       border: padding lets the diagonal show as an even band on all four
       sides, and the hard 50% stop keeps the split a line, not a fade. */
    .photo { position: relative; overflow: hidden; padding: 4px; }
    .photo img.base { width: 100%; height: 100%; display: block; background: #e6ded0; }
    .photo .noshot { width: 100%; height: 100%; background: #e6ded0; display: flex;
      align-items: center; justify-content: center; }
    .photo .crest { position: absolute; right: 8px; bottom: 8px; object-fit: contain;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.55)); }

    /* Graded in the margin, the way a scout initials a sheet. */
    .stamp { transform: rotate(-8deg); border: 2.5px solid currentColor; padding: 4px 12px;
      opacity: 0.86; }
  </style>
</helmet>

<div style="width: 960px; height: 830px; background: #ded4c1; color: #1a1410; padding: 26px; display: flex; flex-direction: column; gap: 18px; background-image: radial-gradient(rgba(120,96,60,0.13) 1px, transparent 1.4px), radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1.4px); background-size: 8px 8px, 13px 13px; background-position: 0 0, 4px 5px;">

  <!-- ── THE CLIPBOARD SHEET ─────────────────────────────────────────── -->
  <div style="position: relative; background: #f7f2e6; box-shadow: 0 2px 0 rgba(26,20,16,0.10), 0 14px 30px rgba(60,44,20,0.22); padding: 40px 26px 26px;">

    <div style="position: absolute; top: -17px; left: 50%; transform: translateX(-50%);">
      <svg width="146" height="36" viewBox="0 0 146 36" fill="none" aria-hidden="true">
        <rect x="1" y="7" width="144" height="21" rx="3" fill="#8e9298"/>
        <rect x="1" y="7" width="144" height="10" rx="3" fill="#b9bec4"/>
        <rect x="1" y="24" width="144" height="4" rx="2" fill="#6d7278"/>
        <circle cx="26" cy="17" r="5.5" fill="#5d6268"/>
        <circle cx="120" cy="17" r="5.5" fill="#5d6268"/>
        <rect x="52" y="0" width="42" height="9" rx="4" fill="#a3a8ae"/>
      </svg>
    </div>

    <div style="display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 3px solid #1a1410; padding-bottom: 11px;">
      <div style="display: flex; flex-direction: column; gap: 1px;">
        <div class="narrow" style="font-size: 11px; font-weight: 600; letter-spacing: 0.32em; text-transform: uppercase; color: #7a6a52;">Scouting sheet &middot; two to find</div>
        <div class="slab misreg" style="font-size: 46px; line-height: 0.96;"><span class="lean">CHAIN</span></div>
      </div>
      <div style="display: flex; align-items: flex-end; gap: 20px;">
        <div class="narrow stamp" style="font-size: 15px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: ${ink};">${grade}</div>
        <div style="width: 1px; height: 36px; background: rgba(26,20,16,0.22);"></div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
          <div class="narrow" style="font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #7a6a52;">No.</div>
          <div class="slab" style="font-size: 26px; line-height: 1;">${id}</div>
        </div>
      </div>
    </div>

    <!-- ── THE CHAIN ─────────────────────────────────────────────────── -->
    <div style="display: flex; align-items: flex-start; gap: 0; padding: 24px 0 4px;">${cards.join('')}
    </div>

    <!-- Foil band: what the board is worth, not what a player scored -->
    <div style="margin-top: 16px; display: flex; align-items: stretch; border: 2.5px solid #1a1410;">
      <div style="flex-grow: 1; padding: 14px 20px; display: flex; flex-direction: column; gap: 3px;">
        <div class="narrow" style="font-size: 10px; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: #7a6a52;">Both blanks must share ${esc(shortClub(named))} &middot; ${xs.length} fit the first, ${ys.length} the second</div>
        <div class="slab" style="font-size: 21px; line-height: 1.15;">${esc(BLURB[id] ?? '')}</div>
      </div>
      <div style="width: 150px; background: linear-gradient(148deg, #e6cb8c, #a8791f 44%, #dcb968 70%, #85601a); display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 2.5px solid #1a1410;">
        <div class="slab" style="font-size: 40px; line-height: 0.95; color: #fffdf7; text-shadow: 0 2px 0 rgba(70,48,6,0.55);">${answers}</div>
        <div class="narrow" style="font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #46300a;">Ways to fill it</div>
      </div>
    </div>
  </div>

  <!-- ── THE PINBOARD ────────────────────────────────────────────────── -->
  <div style="display: flex; flex-direction: column; gap: 13px; padding: 4px 4px 0;">
    <div style="display: flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid rgba(26,20,16,0.42); padding-bottom: 7px;">
      <div class="slab misreg" style="font-size: 20px;"><span class="lean">WHO WOULD HAVE WORKED</span></div>
      <div class="read" style="font-size: 13px; font-style: italic; color: #5c4e3c;">The easiest pair here is ${entry === 0 ? 'nobody obvious' : `worth ${entry}`} &mdash; that is the grade.</div>
    </div>
    <div style="display: flex; gap: 24px; justify-content: center;">${frames.join('')}
    </div>
  </div>

  <div style="margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
    <div class="read" style="font-size: 13px; font-style: italic; color: #5c4e3c;">Split down the middle: the two clubs that made him fit.</div>
    <div class="narrow" style="font-size: 13px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; background: #1a1410; color: #f7f2e6; padding: 12px 24px;">Send the sheet</div>
  </div>
</div>
</x-dc>
</body>
</html>
`;

  // The first board is written as Main.dc.html rather than copied to it: the
  // canvas focuses Main on a focused open, and a second file holding the same
  // sheet would seed a fourth, duplicate artboard.
  const file = id === CHAINS[0] ? 'Main.dc.html' : `Chain${id}.dc.html`;
  await writeFile(`design/${file}`, html);
  console.log(`  ${file}  ${left.name} / ${right.name} via ${shortClub(named)} · ${answers} pairs · entry ${entry}`);
  return { file, height: 830 };
}

/** One line of copy per board — the only thing on the sheet written by hand. */
const BLURB: Record<string, string> = {
  '006': 'Half of Everton has been to Barcelona or Madrid.',
  '007': 'Istanbul collects them on the way past.',
  '008': 'Bremen is a small door into two very big careers.',
};

// --------------------------------------------------------------------- main

console.log('building sheets\n');
const made: { file: string; height: number }[] = [];
for (const id of CHAINS) made.push(await sheet(id));

const TITLE: Record<string, string> = {
  '006': 'Chain 006 · Easy',
  '007': 'Chain 007 · Medium',
  '008': 'Chain 008 · Hard',
};

const canvas = {
  // A row, left to right in grade order, with room for the name strip and the
  // tweak chips that sit above each frame.
  artboards: made.map((m, i) => ({
    file: m.file,
    x: i * 1080,
    y: 0,
    w: 960,
    h: m.height,
    title: TITLE[CHAINS[i]!] ?? CHAINS[i]!,
  })),
  annotations: [
    {
      id: 'brief',
      x: 0,
      y: -150,
      w: 320,
      text: 'Three shipped boards in the scouting-sheet format. Everything here is read from content/chains and data/ — regenerate with npm run build:sheets.',
    },
  ],
  launch: { view: 'canvas' },
};
await writeFile('design/canvas.json', JSON.stringify(canvas, null, 2));
console.log(`\n${fetched.size} assets in ${DIR}`);
