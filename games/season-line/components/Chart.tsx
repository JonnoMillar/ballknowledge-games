import { fifths } from '../lib/table';

/**
 * The season as a line: games along, league position down (1st at the top).
 * The top four and the bottom three are shaded; the games still to come are
 * paper. The part of the line added by the last guess draws itself in from
 * where the line stopped (`from`), so the line grows, never jumps.
 */
const W = 360, H = 232;
const T = 10, B = 26, PH = H - T - B;

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

export default function Chart({ games, teams, line, from = line.length, rival, mini = false }: {
  games: number;
  teams: number;
  line: number[];
  /** Games already drawn before this render; the rest draw in. */
  from?: number;
  rival?: { name: string; line: number[] } | null;
  mini?: boolean;
}) {
  // Room for the labels; the front page's picture has none and is only the part shown, edge to edge.
  const L = mini ? 8 : 34, R = mini ? 14 : 74, PW = W - L - R;
  const span = mini ? Math.max(2, line.length) : games;
  const x = (i: number) => L + (i / (span - 1)) * PW;
  const y = (p: number) => T + ((p - 1) / (teams - 1)) * PH;
  const row = PH / (teams - 1);
  const path = (ps: number[], start = 0) => ps.map((p, i) => `${i ? 'L' : 'M'}${x(start + i).toFixed(1)} ${y(p).toFixed(1)}`).join(' ');
  const shown = line.length;
  const old = Math.max(1, Math.min(from, shown));
  const end = line[shown - 1];
  const rivalEnd = rival?.line[rival.line.length - 1];
  // Keep the two end labels apart when the lines finish close together.
  const labelY = end !== undefined ? y(end) : 0;
  let rivalY = rivalEnd !== undefined ? y(rivalEnd) : 0;
  if (rival && Math.abs(rivalY - labelY) < 14) rivalY = labelY + (rivalY >= labelY ? 14 : -14);

  return (
    <svg className={`sl-chart${mini ? ' sl-chart--mini' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={end ? `After ${shown} of ${games} games: ${ordinal(end)}` : 'The season'}>
      <rect className="sl-chart__band" x={L} y={T - row / 2} width={PW} height={row * 4} />
      <rect className="sl-chart__band sl-chart__band--drop" x={L} y={y(teams - 2) - row / 2} width={PW} height={row * 3} />
      <rect className="sl-chart__future" x={x(shown - 1)} y={T - row / 2} width={L + PW - x(shown - 1)} height={PH + row} />
      {[1, 4, teams - 2, teams].map((p) => (
        <g key={p}>
          <line className="sl-chart__grid" x1={L} x2={L + PW} y1={y(p)} y2={y(p)} />
          {mini ? null : <text className="sl-chart__axis" x={L - 6} y={y(p) + 4} textAnchor="end">{ordinal(p)}</text>}
        </g>
      ))}
      {(mini ? [] : fifths(games)).map((g) => (
        <g key={g}>
          <line className={`sl-chart__tick${g <= shown ? ' is-on' : ''}`} x1={x(g - 1)} x2={x(g - 1)} y1={T + PH + 6} y2={T + PH + 11} />
          {mini ? null : <text className={`sl-chart__axis${g <= shown ? ' is-on' : ''}`} x={x(g - 1)} y={H - 4} textAnchor="middle">{g}</text>}
        </g>
      ))}
      {rival && rival.line.length > 1 ? (
        <g className="sl-chart__rival">
          <path d={path(rival.line)} />
          {mini ? null : <text x={x(rival.line.length - 1) + 8} y={rivalY + 4}>{rival.name}</text>}
        </g>
      ) : null}
      <path className="sl-chart__line" d={path(line.slice(0, old))} />
      {shown > old ? <path key={shown} className="sl-chart__line sl-chart__line--new" d={path(line.slice(old - 1), old - 1)} pathLength={1} /> : null}
      {end !== undefined ? (
        <g key={`end${shown}`} className={shown > old ? 'sl-chart__end is-new' : 'sl-chart__end'}>
          <circle cx={x(shown - 1)} cy={y(end)} r={mini ? 5 : 4.5} />
          {mini ? null : <text x={x(shown - 1) + 8} y={labelY + 4}>{ordinal(end)}</text>}
        </g>
      ) : null}
    </svg>
  );
}
