'use client';
import { batter, fielding, type Match, BATTERS_PER_HALF } from '../../src/lib/slugger/match';
import { plateName } from '../../src/lib/short-name';

/**
 * The diamond, with the runners on it by name, and the half beside it.
 *
 * Home plate at the bottom, first base on the right, as seen from the
 * stands behind the plate. A base with a runner on it is filled and
 * labelled — "Kane" on second — because the runners are the story of the
 * inning: three singles have loaded it and everyone can see what a home
 * run would do.
 */
const BASE = [
  { x: 150, y: 70, label: 'first', dx: 14, anchor: 'start' },
  { x: 100, y: 22, label: 'second', dx: 0, anchor: 'middle' },
  { x: 50, y: 70, label: 'third', dx: -14, anchor: 'end' },
] as const;

function Dots({ n, of, tone }: { n: number; of: number; tone: 'up' | 'knuckle' }) {
  return (
    <span className={`slug-count__dots slug-count__dots--${tone}`} aria-hidden="true">
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < n ? 'is-on' : ''} />)}
    </span>
  );
}

export default function Diamond({ match }: { match: Match }) {
  const up = batter(match);
  const live = match.status === 'live';
  return (
    <div className="slug-field">
      <svg className="slug-diamond" viewBox="0 0 200 128" role="img" aria-label={
        match.bases.some(Boolean)
          ? `Runners: ${match.bases.map((r, i) => (r ? `${r.name} on ${BASE[i]!.label}` : null)).filter(Boolean).join(', ')}`
          : 'Bases empty'
      }>
        {/* The infield, and the base paths. */}
        <polygon points="100,118 150,70 100,22 50,70" className="slug-diamond__dirt" />
        <polygon points="100,118 150,70 100,22 50,70" className="slug-diamond__path" />
        {/* Home plate. */}
        <polygon points="94,112 106,112 106,118 100,124 94,118" className="slug-diamond__home" />
        {BASE.map((b, i) => {
          const r = match.bases[i];
          return (
            <g key={b.label}>
              <rect
                x={b.x - 7} y={b.y - 7} width="14" height="14"
                transform={`rotate(45 ${b.x} ${b.y})`}
                className={`slug-diamond__base${r ? ' is-on' : ''}`}
              />
              {r ? (
                <text
                  x={b.x + b.dx} y={i === 1 ? b.y - 13 : b.y + 4}
                  textAnchor={b.anchor}
                  className="slug-diamond__name"
                >{plateName(r.id, r.name)}</text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="slug-count">
        <div className="slug-count__row">
          <span className="slug-count__label">Batters</span>
          <Dots n={match.up} of={BATTERS_PER_HALF} tone="up" />
        </div>
        <div className="slug-count__row">
          <span className="slug-count__label">Knucklers</span>
          <Dots n={match.knuckleballs[fielding(match)]} of={3} tone="knuckle" />
        </div>
        <div className="slug-count__who">
          {live ? (
            <>
              <span className="slug-count__label">At bat</span>
              <span className="slug-count__batter display">{up.name}</span>
              {match.sides[up.side].name !== up.name ? <span className="slug-count__side">{match.sides[up.side].name}</span> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
