'use client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { crestPath } from '../../../src/lib/clubs';

/**
 * The season as a line: games along, league position down (1st at the top).
 *
 * The games axis always ends at the last game shown, so the line runs to the
 * right edge; a guess that adds games stretches the axis and the line grows
 * into it. Each line ends in a badge on the right: a club's crest, or a
 * question mark for the club the player has not named yet. Drawn at the size
 * of its box, so the type stays small on a big screen.
 */
export interface Runner { line: number[]; colour: string; q: string | null; name?: string }

const useLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const R = 13; // badge radius
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `target`, reached smoothly from wherever the last value stopped. */
function useTween(target: number, ms = 850) {
  const [v, setV] = useState(target);
  const at = useRef(target);
  useEffect(() => {
    if (at.current === target) return;
    if (calm()) { at.current = target; setV(target); return; }
    const from = at.current, t0 = performance.now() + 120;
    let id = 0;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      at.current = from + (target - from) * ease(k);
      setV(at.current);
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, ms]);
  return v;
}

export default function Chart({ games, teams, line, me, rivals = [], mini = false }: {
  games: number;
  teams: number;
  line: number[];
  /** The main line's colour and badge; `q` null is the hidden club. */
  me: { colour: string; q: string | null; name?: string };
  rivals?: { club: string; line: number[]; colour: string; q: string | null; name?: string }[];
  /** The front page's picture: no axes, no badges. */
  mini?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: mini ? 360 : 600, h: mini ? 170 : 400 });
  useLayout(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(120, el.clientHeight) });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** The line the pointer is on: the rest step back. */
  const [hot, setHot] = useState<string | null>(null);
  const shown = line.length;
  const t = useTween(Math.max(2, shown));
  const { w, h } = size;
  const L = mini ? 4 : 44, Rt = mini ? 14 : R * 2 + 14, T = mini ? 8 : 12, B = mini ? 8 : 46;
  const PW = w - L - Rt, PH = h - T - B;
  const idx = t - 1;
  const x = (i: number) => L + (i / idx) * PW;
  const y = (p: number) => T + ((p - 1) / (teams - 1)) * PH;
  const row = PH / (teams - 1);

  /** The line up to game t, the last stretch between two games cut part way. */
  const pts = (ps: number[]): [number, number][] => {
    const lo = Math.min(ps.length - 1, Math.floor(idx + 1e-6));
    const out = ps.slice(0, lo + 1).map((p, i): [number, number] => [x(i), y(p)]);
    const f = idx - lo;
    if (f > 1e-6 && ps[lo + 1] !== undefined) out.push([x(idx), y(ps[lo]! + (ps[lo + 1]! - ps[lo]!) * f)]);
    return out;
  };
  const d = (p: [number, number][]) => p.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');

  const runners: (Runner & { key: string; main?: boolean })[] = [
    ...rivals.map((r) => ({ ...r, key: r.club })),
    { line, colour: me.colour, q: me.q, name: me.name, key: 'me', main: true },
  ].map((r) => ({ ...r, line: r.line.slice(0, shown) }));
  const drawn = runners.map((r) => ({ r, p: pts(r.line) }));
  const lone = runners.length > 1;

  // Badges sit at the right, nudged apart where the lines finish close together.
  const ends = drawn.map(({ p }) => p[p.length - 1]![1]);
  const order = ends.map((_, i) => i).sort((a, b) => ends[a]! - ends[b]!);
  const gap = R * 2 + 2, lo = T + R, hi = T + PH - R;
  const by = [...ends];
  order.forEach((k, n) => { by[k] = Math.max(lo, n ? Math.max(ends[k]!, by[order[n - 1]!]! + gap) : ends[k]!); });
  for (let n = order.length - 1; n >= 0; n--) {
    const k = order[n]!;
    by[k] = Math.min(by[k]!, n < order.length - 1 ? Math.min(hi, by[order[n + 1]!]! - gap) : hi);
  }

  const last = Math.round(t);
  const ticks = [1, ...Array.from({ length: Math.floor(last / 5) }, (_, i) => (i + 1) * 5)].filter((g) => g === 1 || g <= last - 2);
  const labelled = [...new Set([...ticks, last])];
  const rows = [1, 5, 10, 15, 20].filter((p) => p <= teams);

  return (
    <div ref={box} className={`sl-plot${mini ? ' sl-plot--mini' : ''}`}>
      <svg className={`sl-chart${mini ? ' sl-chart--mini' : ''}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img"
        aria-label={`After ${shown} of ${games} games`}>
        <rect className="sl-chart__band" x={L} y={T - row / 2} width={PW} height={row * 4} />
        <rect className="sl-chart__band sl-chart__band--drop" x={L} y={y(teams - 2) - row / 2} width={PW} height={row * 3} />
        <g className="sl-chart__grid" shapeRendering="crispEdges">
          {Array.from({ length: teams }, (_, i) => <line key={`r${i}`} x1={L} x2={L + PW} y1={Math.round(y(i + 1)) + 0.5} y2={Math.round(y(i + 1)) + 0.5} />)}
          {Array.from({ length: Math.floor(idx + 1e-6) + 1 }, (_, i) => <line key={`c${i}`} x1={Math.round(x(i)) + 0.5} x2={Math.round(x(i)) + 0.5} y1={T - row / 2} y2={T + PH + row / 2} />)}
        </g>
        {mini ? null : (
          <>
            {rows.map((p) => <text key={p} className="sl-chart__axis" x={L - 7} y={y(p) + 3.5} textAnchor="end">{p}</text>)}
            {labelled.map((g) => (
              <text key={g} className={`sl-chart__axis${g === last ? ' is-end' : ''}`} x={x(g - 1)} y={T + PH + row / 2 + 13} textAnchor="middle">{g}</text>
            ))}
            <text className="sl-chart__title" x={L + PW / 2} y={h - 4} textAnchor="middle">Games</text>
            <text className="sl-chart__title" transform={`translate(10 ${T + PH / 2}) rotate(-90)`} textAnchor="middle">Position</text>
          </>
        )}
        {drawn.map(({ r, p }, k) => ({ r, p, k })).sort((a, b) => Number(a.r.key === hot) - Number(b.r.key === hot)).map(({ r, p, k }) => (
          <g key={r.key} className={`${r.main ? 'sl-chart__me' : 'sl-chart__rival'}${hot && lone ? (hot === r.key ? ' is-hot' : ' is-dim') : ''}`} style={{ '--c': r.colour } as CSSProperties}
            onPointerEnter={() => setHot(r.key)} onPointerLeave={() => setHot(null)}>
            <path className="sl-chart__line" d={d(p)} />
            {mini ? null : <path className="sl-chart__hit" d={d(p)} />}
            {mini ? null : (
              <g transform={`translate(${L + PW + R + 6} ${by[k]!.toFixed(1)})`}>
                <path className="sl-chart__lead" d={`M${-(R + 6)} ${(ends[k]! - by[k]!).toFixed(1)}L${-R} 0`} />
                {r.q ? <image href={crestPath(r.q)} x={-R} y={-R} width={R * 2} height={R * 2} preserveAspectRatio="xMidYMid meet" />
                  : <><circle className="sl-chart__q-disc" r={R - 1} /><text className="sl-chart__q" y={5.5} textAnchor="middle">?</text></>}
                {hot === r.key && r.name ? <text className="sl-chart__tag" x={-R - 8} y={4} textAnchor="end">{r.name}</text> : null}
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
