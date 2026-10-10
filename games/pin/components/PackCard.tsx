import { Ball, Lines, PinMark } from './Pitch';
import { packStatus, type PinPlay, type Throw } from '../lib/progress';
import { packScore, tier, TIER_NAME } from '../lib/score';
import type { PackCard as Card, PackKind } from '../lib/types';

export const KIND_NAME: Record<PackKind, string> = {
  month: 'Goal of the Month', round: 'Round', season: 'Season', club: 'Club', classic: 'Classic',
};

/** The thrown pins of a save, with where each goal was struck. */
export const pairsOf = (play: PinPlay | undefined) =>
  (play?.throws ?? []).filter((t): t is Throw => !!t).map((t) => ({ pin: t.pin, at: t.answer.at }));

/**
 * A pack's art: its kind's colour and the top of the pitch, with this
 * browser's pins and true spots once it has thrown any. `tall` shows more
 * of the half, for the hub's top card.
 */
export function KindArt({ kind, play, tall }: { kind: PackKind; play?: PinPlay; tall?: boolean }) {
  return (
    <span className={`pin__art pin__art--${kind}${tall ? ' pin__art--tall' : ''}`}>
      <span className="pin__artkind display">{KIND_NAME[kind]}</span>
      <svg viewBox={tall ? '2 -3 64 34' : '4 -14 60 36'} preserveAspectRatio="xMidYMin slice" aria-hidden>
        <Lines />
        {pairsOf(play).map((p, i) => (
          <g key={i}>
            <line className="pitch__trail pitch__trail--still" x1={p.pin.x} y1={p.pin.y} x2={p.at.x} y2={p.at.y} />
            <Ball at={p.at} still />
            <PinMark at={p.pin} />
          </g>
        ))}
      </svg>
    </span>
  );
}

/** A pack on a shelf: art, title, and where this browser is with it. `play` is undefined until the store is read. */
export default function PackCard({ card, play, loaded }: { card: Card; play?: PinPlay; loaded: boolean }) {
  const s = packStatus(play, card.size);
  const score = s.state === 'done' ? packScore(s.distances) : null;
  return (
    <a className="pin__pack" href={`/pin/${card.id}`}>
      <KindArt kind={card.kind} play={s.state === 'unplayed' ? undefined : play} />
      <span className="pin__packbody">
        <span className="pin__packtitle display">{card.title}</span>
        <span className="pin__packsub">{card.subtitle}</span>
        <span className="pin__packfoot">
          {!loaded ? ' ' : score !== null ? (
            <>
              <span className="pin__packscore display">{score}</span>
              <Stamp score={score} small />
            </>
          ) : (
            <>
              {card.isNew && s.state === 'unplayed' ? <span className="pin__new display">New</span> : null}
              <span className="pin__status">{s.state === 'part' ? `${s.thrown} of ${card.size}` : 'Not played'}</span>
            </>
          )}
        </span>
      </span>
    </a>
  );
}

/** A tier's name on its colour. */
export function Stamp({ score, small, className = '' }: { score: number; small?: boolean; className?: string }) {
  const t = tier(score);
  return <span className={`pin__tier pin__tier--${t}${small ? ' pin__tier--small' : ''} display ${className}`}>{TIER_NAME[t]}</span>;
}
