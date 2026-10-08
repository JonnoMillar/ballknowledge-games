'use client';
import { useState } from 'react';
import Pitch from './Pitch';
import { againstPar, points, ring, RING_NAME, shareText, tally, type Mode } from '../lib/score';
import type { Throw } from '../lib/progress';
import type { BoardView } from '../lib/types';

/** The board finished: the total against par, all six pins, the list, the streak, the share. */
export default function FullTime({ board, throws, mode, streak }: {
  board: BoardView; throws: Throw[]; mode: Mode; streak: number | null;
}) {
  const ds = throws.map((t) => t.answer.distance);
  const t = tally(ds);
  const bulls = ds.filter((d) => ring(d) === 'bullseye').length;
  const text = shareText(board.title, ds, board.par, mode);
  return (
    <section className="pin__full">
      <div className="pin__fullhead">
        <div>
          <span className="pin__label">Full time</span>
          <span className="pin__total display">{mode === 'points' ? t.points : `${t.metres.toFixed(1)} m`}</span>
          <span className="pin__sub">
            {mode === 'points'
              ? `out of ${ds.length * 100}, par ${board.par.points}`
              : `par ${Math.round(board.par.metres)} m, ${againstPar(t.metres, board.par.metres)}`}
          </span>
        </div>
        {bulls ? <span className="pin__stamp display">{bulls === 1 ? '1 bullseye' : `${bulls} bullseyes`}</span> : null}
      </div>
      <Pitch label="All six pins against where each goal was struck" all={throws.map((x) => ({ pin: x.pin, at: x.answer.at }))} />
      <ol className="pin__list">
        {board.goals.map((g, i) => {
          const d = ds[i]!;
          const r = ring(d);
          return (
            <li key={g.slug} className="pin__row">
              <span className="pin__n display">{i + 1}</span>
              <span className="pin__who">
                <span className="display">{g.scorer}</span>
                <span>{g.match}, {g.date.slice(0, 4)}</span>
              </span>
              <span className="pin__val display">{mode === 'points' ? points(d) : `${d.toFixed(1)} m`}</span>
              <span className={`pin__ring pin__ring--${r} display`}>{RING_NAME[r]}</span>
            </li>
          );
        })}
      </ol>
      {streak ? <p className="pin__streak">Streak: {streak} {streak === 1 ? 'day' : 'days'}</p> : null}
      <pre className="pin__share">{text}</pre>
      <ShareButton text={text} />
    </section>
  );
}

/** Share where the phone can, else copy. A cancelled share is not a failure. */
function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2200);
  }
  return (
    <button type="button" className="pin__throw display" onClick={share}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not share' : 'Share'}
    </button>
  );
}
