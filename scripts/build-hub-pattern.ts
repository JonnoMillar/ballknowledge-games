/**
 * The hub's background: one line glyph per game (a chain link, Spoofed's
 * shirt, Season line's climb, Rondo's cone, the mole, the pin, Steps'
 * stair), scattered at random sizes and angles over a square tile that
 * wraps, like the shapes moulded into a PlayStation pad. The SVG is only a
 * mask: the hub paints it in the page's own colours (THE HUB in
 * app/globals.css), so it reads only up close.
 *
 *   npx tsx scripts/build-hub-pattern.ts
 *
 * A new game gets a glyph here and a rerun. Seeded, so a rerun with the
 * same glyphs writes the same file.
 */
import { writeFileSync } from 'node:fs';

/** Drawn on a 24-unit square, centred on 12,12, as strokes. */
const GLYPHS: Record<string, string> = {
  chain: '<rect x="2" y="8.5" width="12" height="7" rx="3.5"/><rect x="10" y="8.5" width="12" height="7" rx="3.5"/>',
  spoofed: '<path d="M8.5 4 4 6 2 10.5l3 1.3 1-2V20h12V9.8l1 2 3-1.3L20 6l-4.5-2c-1 2-5.6 2-7 0z"/>',
  'season-line': '<path d="M3 19l5-6 4 3 7-9M15 7h4v4"/>',
  rondo: '<path d="M12 3.5 7.2 18h9.6zM9.6 11h4.8M3.5 20.5h17"/>',
  'odd-man-out': '<path d="M6.5 19v-6.5a5.5 5.5 0 0 1 11 0V19M2.5 20.5h19"/><circle cx="10" cy="12" r=".6"/><circle cx="14" cy="12" r=".6"/><path d="M11.2 15h1.6"/>',
  pin: '<path d="M12 21.5C8 16.5 6 13 6 9.5a6 6 0 0 1 12 0c0 3.5-2 7-6 12z"/><circle cx="12" cy="9.5" r="2.2"/>',
  steps: '<path d="M3 20h4.5v-4.5H12V11h4.5V6.5H21"/>',
};

const TILE = 360;
const COUNT = 150;
const GAP = 25; // closest two glyph centres, wrapping across the tile's edges

// mulberry32: small, seeded, good enough to scatter shapes.
let seed = 20261023;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const ids = Object.keys(GLYPHS);
const placed: { x: number; y: number }[] = [];
const uses: string[] = [];
for (let tries = 0; placed.length < COUNT && tries < 20000; tries++) {
  const x = rand() * TILE;
  const y = rand() * TILE;
  const near = placed.some((p) => {
    const dx = Math.min(Math.abs(p.x - x), TILE - Math.abs(p.x - x));
    const dy = Math.min(Math.abs(p.y - y), TILE - Math.abs(p.y - y));
    return dx * dx + dy * dy < GAP * GAP;
  });
  if (near) continue;
  placed.push({ x, y });
  // Round-robin, so every game shows up as often as the others.
  const id = ids[placed.length % ids.length]!;
  const size = 13 + rand() * 6;
  const turn = Math.round(rand() * 360);
  // A glyph across an edge is drawn again on the far side, so tiles meet unseen.
  for (const ox of [-TILE, 0, TILE]) {
    for (const oy of [-TILE, 0, TILE]) {
      const cx = x + ox;
      const cy = y + oy;
      if (cx < -size || cx > TILE + size || cy < -size || cy > TILE + size) continue;
      uses.push(`<use href="#${id}" transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) rotate(${turn} ${(size / 2).toFixed(1)} ${(size / 2).toFixed(1)}) scale(${(size / 24).toFixed(3)})"/>`);
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
<defs>${ids.map((id) => `<g id="${id}">${GLYPHS[id]}</g>`).join('')}</defs>
<g fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
${uses.join('\n')}
</g>
</svg>
`;
writeFileSync('public/hub/pattern.svg', svg);
console.log(`public/hub/pattern.svg: ${placed.length} glyphs, ${uses.length} drawn`);
