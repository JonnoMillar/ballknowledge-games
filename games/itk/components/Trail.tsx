'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { crestPath } from '../../../src/lib/clubs';
import ClubBadge, { shortClubName } from '../../../components/ClubBadge';
import type { ItkStop } from '../lib/types';
import type { Pick } from '../lib/progress';

/**
 * A career as a trail of crests, laid out like a board-game path.
 *
 * Rows run left to right, then right to left, so the route never jumps back
 * across the page: each turn is one short step down. The number of columns
 * comes from the width the trail has, balanced so the last row is not a
 * lone straggler. The route is drawn from geometry, not measured from the
 * DOM, so it cannot drift from the cards.
 */
const SMALL = { w: 92, h: 118, gx: 16, gy: 28 };
const LARGE = { w: 116, h: 142, gx: 44, gy: 46 };

type Pt = { x: number; y: number; row: number; col: number };

export default function Trail({ stops, picks, fakeIndex, real, pending, locked, onPick }: {
  stops: ItkStop[];
  picks: Pick[];
  fakeIndex: number | null;
  /** The club the fake was covering, once the round is over. */
  real: { clubId: string; name: string } | null;
  pending: number | null;
  locked: boolean;
  onPick: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  /** Crests whose image would not load: drawn as the album's monogram instead. */
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());
  useLayoutEffect(() => {
    const el = ref.current!;
    // Measured now as well as observed: an observer only reports on a frame,
    // and a tab that is not painting never gets one.
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = stops.length;
  const g = width !== null && width < 600 ? SMALL : LARGE;
  const maxCols = Math.max(2, Math.min(5, Math.floor(((width ?? 0) + g.gx) / (g.w + g.gx))));
  const rows = Math.ceil(n / maxCols);
  const cols = Math.ceil(n / rows);
  const pts: Pt[] = stops.map((_, i) => {
    const row = Math.floor(i / cols);
    const c = i % cols;
    const col = row % 2 === 0 ? c : cols - 1 - c;
    return { row, col, x: col * (g.w + g.gx) + g.w / 2, y: row * (g.h + g.gy) + g.h / 2 };
  });
  const W = cols * g.w + (cols - 1) * g.gx;
  const H = rows * g.h + (rows - 1) * g.gy;

  const picked = new Map(picks.map((p) => [p.index, p.fake]));
  // The two legs into and out of the fake: once it is peeled off they are the real route again, or,
  // where the fake was added, a move that never happened.
  const touches = (i: number) => fakeIndex !== null && (i === fakeIndex || i + 1 === fakeIndex);

  /** One side of a crest sticker: year and loan tag, crest, name. */
  const face = (clubId: string, clubName: string, s: ItkStop, cls: string) => {
    const name = shortClubName(clubName);
    return (
      <span className={`tcard__face ${cls}`}>
        <span className="tcard__top">
          <span className="tcard__year display">{s.year}</span>
          {s.loan ? <span className="tcard__loan">Loan</span> : null}
        </span>
        <span className="tcard__crest">
          {broken.has(clubId) ? (
            <ClubBadge clubId={clubId} club={{ name: clubName }} size={g === SMALL ? 54 : 64} />
          ) : (
            <img src={crestPath(clubId)} alt="" draggable={false} onError={() => setBroken((b) => new Set(b).add(clubId))} />
          )}
        </span>
        <span className={`tcard__name display ${name.length > 14 ? 'tcard__name--long' : ''}`}>{name}</span>
      </span>
    );
  };

  return (
    <div className="trail" ref={ref}>
      {width === null ? null : (
        <div className="trail__board" style={{ width: W, height: H, ['--cw' as string]: `${g.w}px`, ['--ch' as string]: `${g.h}px` }}>
          <svg className="trail__route" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
            {pts.slice(0, -1).map((a, i) => {
              const b = pts[i + 1]!;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const angle = a.row !== b.row ? 90 : b.x > a.x ? 0 : 180;
              return (
                <g key={i} className={`trail__leg ${touches(i) ? (real ? 'is-restored' : 'is-cut') : ''}`} style={{ ['--i' as string]: i }}>
                  <path className="trail__line" d={`M${a.x} ${a.y} L${b.x} ${b.y}`} pathLength={1} />
                  <path className="trail__arrow" d="M-3.5 -5 L2.5 0 L-3.5 5" transform={`translate(${mx} ${my}) rotate(${angle})`} />
                </g>
              );
            })}
          </svg>

          {stops.map((s, i) => {
            const p = pts[i]!;
            const verdict = picked.get(i);
            const isFake = fakeIndex === i;
            const state = isFake ? 'is-fake' : verdict === false ? 'is-real' : '';
            const circled = pending === i || verdict !== undefined;
            const peeled = isFake;
            return (
              <button
                key={i}
                type="button"
                className={`tcard ${state} ${circled ? 'is-circled' : ''} ${pending === i ? 'is-pending' : ''} ${locked || verdict !== undefined ? 'is-locked' : ''}`}
                style={{ left: p.x - g.w / 2, top: p.y - g.h / 2, ['--i' as string]: i }}
                onClick={() => onPick(i)}
                disabled={locked || pending !== null || verdict !== undefined}
                aria-label={peeled
                  ? real
                    ? `${s.name} was the fake; really ${real.name}, ${s.year}${s.loan ? ', on loan' : ''}`
                    : `${s.name} was the fake; that move never happened`
                  : `${s.name}, ${s.year}${s.loan ? ', on loan' : ''}${verdict === false ? ', real' : ''}`}
              >
                {peeled ? (
                  <>
                    {/* The real sticker was under the fake all along, or nothing was: an empty space in the album. */}
                    {real ? face(real.clubId, real.name, s, 'tcard__face--real') : <span className="tcard__face tcard__face--empty" />}
                    <span className="tcard__peel" aria-hidden>
                      {face(s.clubId, s.name, s, 'tcard__face--front')}
                    </span>
                    <span className="tcard__was" aria-hidden>
                      <img src={crestPath(s.clubId)} alt="" draggable={false} />
                    </span>
                  </>
                ) : face(s.clubId, s.name, s, '')}
                <Loop className="tcard__loop" />
                {verdict === false ? <span className="tcard__tick" aria-hidden><Tick /></span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A marker loop, the way you circle something in the paper. */
export function Loop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 140" preserveAspectRatio="none" aria-hidden>
      <path
        d="M22 22 C44 0 104 2 116 42 C128 84 110 134 58 138 C14 141 -2 104 4 66 C8 40 26 18 70 12"
        pathLength={1}
      />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <path d="M3.5 8.4 L6.6 11.3 L12.6 4.9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
