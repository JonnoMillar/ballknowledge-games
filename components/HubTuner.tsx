'use client';
import { useEffect, useState } from 'react';

/**
 * Dev only: dials for the hub's glyph pattern (THE HUB in app/globals.css).
 * It writes the pattern's tokens onto `.hub` live and keeps them in this
 * browser, each style with its own dials, so Off / Pressed / Raised compare
 * without losing a tweak. Copy puts the CSS on the clipboard to bake in.
 */
type Style = 'pressed' | 'raised';
type Dials = {
  page: string; face: string; faceA: number;
  shade: string; shadeA: number; light: string; lightA: number;
  depth: number; soft: number; tile: number;
};
type Tune = { on: boolean; style: Style } & Record<Style, Dials>;

const PRESETS: Record<Style, Dials> = {
  pressed: { page: '#F2EEE6', face: '#FFFFFF', faceA: 80, shade: '#141210', shadeA: 11, light: '#FFFFFF', lightA: 0, depth: 1, soft: 0, tile: 360 },
  raised: { page: '#F2EEE6', face: '#FAF8F3', faceA: 100, shade: '#141210', shadeA: 24, light: '#FFFFFF', lightA: 100, depth: 1.5, soft: 0.75, tile: 360 },
};
const KEY = 'hub-tune';

const rgba = (hex: string, pct: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${(pct / 100).toFixed(2)})`;
};

function tokens(d: Dials): Record<string, string> {
  return {
    '--hub-page': d.page,
    '--glyph-face': rgba(d.face, d.faceA),
    '--glyph-shade': rgba(d.shade, d.shadeA),
    '--glyph-light': rgba(d.light, d.lightA),
    '--glyph-depth': `${d.depth}px`,
    '--glyph-soft': `${d.soft}px`,
    '--glyph-tile': `${d.tile}px`,
  };
}

export default function HubTuner() {
  const [t, setT] = useState<Tune>({ on: true, style: 'raised', ...PRESETS });
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const d = t[t.style];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setT(JSON.parse(saved) as Tune);
    } catch { /* first visit or storage blocked: the presets stand */ }
  }, []);

  useEffect(() => {
    const hub = document.querySelector<HTMLElement>('.hub');
    if (!hub) return;
    for (const [k, v] of Object.entries(tokens(t[t.style]))) hub.style.setProperty(k, v);
    hub.classList.toggle('hub--plain', !t.on);
    try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* not kept, still applied */ }
  }, [t]);

  const set = (patch: Partial<Dials>) => setT((p) => ({ ...p, [p.style]: { ...p[p.style], ...patch } }));
  const copy = () => {
    const css = Object.entries(tokens(d)).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    void navigator.clipboard.writeText(`/* hub pattern: ${t.on ? t.style : 'off'} */\n${css}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const range = (label: string, key: keyof Dials, min: number, max: number, step: number, unit: string) => (
    <label>
      {label}
      <input type="range" min={min} max={max} step={step} value={d[key]} onChange={(e) => set({ [key]: Number(e.target.value) })} />
      <output>{d[key]}{unit}</output>
    </label>
  );
  const colour = (label: string, key: 'page' | 'face' | 'shade' | 'light') => (
    <label>
      {label}
      <input type="color" value={d[key]} onChange={(e) => set({ [key]: e.target.value })} />
      <output />
    </label>
  );

  return (
    <aside className="tuner" data-closed={open ? undefined : ''} aria-label="Pattern dials">
      <div className="tuner__head">
        <span>Pattern dials</span>
        <button type="button" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'}</button>
      </div>
      <div className="tuner__modes" role="group" aria-label="Style">
        <button type="button" aria-pressed={!t.on} onClick={() => setT({ ...t, on: false })}>Off</button>
        <button type="button" aria-pressed={t.on && t.style === 'pressed'} onClick={() => setT({ ...t, on: true, style: 'pressed' })}>Pressed</button>
        <button type="button" aria-pressed={t.on && t.style === 'raised'} onClick={() => setT({ ...t, on: true, style: 'raised' })}>Raised</button>
      </div>
      {colour('Background', 'page')}
      {colour('Shapes', 'face')}
      {range('Shape fill', 'faceA', 0, 100, 1, '%')}
      {colour('Shadow', 'shade')}
      {range('Shadow', 'shadeA', 0, 60, 1, '%')}
      {colour('Highlight', 'light')}
      {range('Highlight', 'lightA', 0, 100, 1, '%')}
      {range('Depth', 'depth', 0, 4, 0.25, 'px')}
      {range('Softness', 'soft', 0, 4, 0.25, 'px')}
      {range('Spread', 'tile', 220, 620, 10, 'px')}
      <div className="tuner__foot">
        <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy values'}</button>
        <button type="button" onClick={() => setT({ ...t, [t.style]: PRESETS[t.style] })}>Reset</button>
      </div>
    </aside>
  );
}
