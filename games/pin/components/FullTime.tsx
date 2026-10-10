'use client';
import { useState, type CSSProperties } from 'react';
import Pitch from './Pitch';
import { Stamp } from './PackCard';
import Scale from './Scale';
import { standing, type PlayRecord, type Throw } from '../lib/progress';
import { nextTier, packScore, points, ring, RING_NAME, shareText, tier, TIER_NAME } from '../lib/score';
import type { BoardView } from '../lib/types';

const PLACE = ['best', 'second best', 'third best'];

/**
 * The pack finished. The list adds up goal by goal, then the score lands
 * on the scale with its tier (a slam from Sharp up; Wide and Close just
 * appear). Then what the next tier needs, the bullseyes, and where this
 * pack sits in this browser's record.
 */
export default function FullTime({ board, throws, next, rec }: {
  board: BoardView; throws: Throw[]; next: { id: string; title: string } | null; rec: PlayRecord;
}) {
  const ds = throws.map((t) => t.answer.distance);
  const score = packScore(ds);
  const up = nextTier(score);
  const bulls = ds.filter((d) => ring(d) === 'bullseye').length;
  const place = PLACE[standing(rec.scores.values(), score) - 1];
  const big = score >= 60;
  // The score lands after the last row has slid in.
  const land = { '--land': `${throws.length * 150 + 200}ms` } as CSSProperties;
  return (
    <section className="pin__full">
      <div className="pin__fullcard" style={land}>
        <span className="pin__eyebrow">Full time</span>
        <div className="pin__fullhead">
          <span className="pin__total pin__land">
            <span className="display">{score}</span>
            <small className="display">/100</small>
          </span>
          <Stamp score={score} className={`pin__stamp ${big ? 'pin__stamp--slam' : 'pin__land'}`} />
        </div>
        <Scale score={score} />
        <p className="pin__fullnote">
          <b>{up ? `${up.gap} off ${TIER_NAME[up.tier]}.` : 'Top tier.'}</b>
          {bulls ? <span> {bulls === 1 ? '1 bullseye.' : `${bulls} bullseyes.`}</span> : null}
          {rec.packs >= 2 ? (
            <span> Your average is {rec.average}{place ? `; this is your ${place}` : ''}.</span>
          ) : null}
        </p>
      </div>
      <div className="pin__fullpitch">
        <Pitch label={`All ${throws.length} pins against where each goal was struck`} all={throws.map((x) => ({ pin: x.pin, at: x.answer.at }))} />
      </div>
      <ol className="pin__list">
        {board.goals.map((g, i) => {
          const d = ds[i]!;
          const r = ring(d);
          return (
            <li key={g.slug} className="pin__row" style={{ animationDelay: `${i * 150}ms` }}>
              <span className="pin__n display">{i + 1}</span>
              <span className="pin__who">
                <span className="display">{g.scorer}</span>
                <span>{d.toFixed(1)} m off · {g.match}, {g.date.slice(0, 4)}</span>
              </span>
              <span className="pin__val display">{points(d)}</span>
              <span className={`pin__ring pin__ring--${r} display`}>{RING_NAME[r]}</span>
            </li>
          );
        })}
      </ol>
      <div className="pin__fullshare">
        <pre className="pin__share">{shareText(board.title, ds)}</pre>
        <div className="pin__fullactions">
          <ShareButton text={shareText(board.title, ds)} />
          {next ? (
            <a className="pin__nextpack display" href={`/pin/${next.id}`}>
              Next pack<small>{next.title}</small>
            </a>
          ) : null}
        </div>
      </div>
      <span className="pin__srscore" aria-live="polite">{`${score} out of 100, ${TIER_NAME[tier(score)]}`}</span>
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
