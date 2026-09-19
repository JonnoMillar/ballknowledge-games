'use client';
import type { CSSProperties, ReactNode } from 'react';
import { Figure, solid, StickerFace } from './Sticker';
import { RINGS } from './ChainBoard';
import type { BoardSummary } from '../src/lib/chain/client';

/**
 * A board as a picture: the givens on their grounds, the plates still to
 * fill, and the links between them. No behaviour, no album, no drag; the
 * whole thing is usually wrapped in a link to the board itself.
 *
 * Once a board has been played the links carry the result, so the home
 * page can show the chain that held rather than say so.
 */
export default function BoardPreview({ board, links = null, plates = true }: {
  board: BoardSummary;
  /** The result, link by link, once played. */
  links?: readonly boolean[] | null;
  /** Print the clue under each empty plate. */
  plates?: boolean;
}) {
  const n = board.slots.length;
  const closed = board.closed;

  const sticker = (i: number): ReactNode => {
    const given = board.slots[i];
    if (given) {
      return <StickerFace player={given} image={board.images[given.id]} ground={solid(given.ground)} index={i + 1} />;
    }
    const clue = board.clues[i];
    return (
      <div className="sticker sticker--empty sticker--still">
        <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
        <span className="sticker__plate">
          <span className="sticker__hint">{plates && clue ? clue : ''}</span>
          <span className="sticker__no">{i + 1}</span>
        </span>
      </div>
    );
  };

  const link = (li: number, vertical: boolean): ReactNode => {
    const state = links ? (links[li] ? 'plink--held' : 'plink--broken') : '';
    return (
      <span className={`plink ${vertical ? 'plink--v' : 'plink--h'} ${state}`} aria-hidden>
        <span className="plink__rule" />
        <span className="plink__die">
          {links ? (
            links[li] ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.6 2.6L10 3.5" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
            )
          ) : null}
        </span>
      </span>
    );
  };

  if (closed && RINGS[n]) {
    const layout = RINGS[n]!;
    const rows = Math.max(...layout.map(([r]) => r)) + 1;
    const cells: ReactNode[] = [];
    for (let i = 0; i < n; i++) {
      const [r, c] = layout[i]!;
      cells.push(<div key={`s${i}`} className="preview__cell" style={{ gridRow: 2 * r + 1, gridColumn: 2 * c + 1 }}>{sticker(i)}</div>);
      const [r2, c2] = layout[(i + 1) % n]!;
      const vertical = c === c2;
      const style: CSSProperties = vertical
        ? { gridRow: 2 * Math.min(r, r2) + 2, gridColumn: 2 * c + 1 }
        : { gridRow: 2 * r + 1, gridColumn: 2 * Math.min(c, c2) + 2 };
      cells.push(<div key={`l${i}`} className="preview__cell" style={style}>{link(i, vertical)}</div>);
    }
    return (
      <div
        className="preview preview--ring"
        style={{ gridTemplateRows: Array.from({ length: rows }, (_, r) => (r === 0 ? 'auto' : 'var(--link-h) auto')).join(' ') }}
      >
        {cells}
      </div>
    );
  }

  return (
    <div className="preview preview--line">
      {board.slots.map((_, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {i > 0 ? <div className="preview__cell">{link(i - 1, false)}</div> : null}
          <div className="preview__cell">{sticker(i)}</div>
        </div>
      ))}
    </div>
  );
}
