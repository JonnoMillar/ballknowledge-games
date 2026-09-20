'use client';
import ClubBadge, { shortClubName } from '../ClubBadge';
import { StickerFace, solid } from '../Sticker';
import type { ClubView } from '../../src/lib/clubs';
import type { Carrier, Touch } from '../../src/lib/rondo/match';

/**
 * The ball: who has it, how it got there, and what has burnt.
 *
 * The carrier is one big sticker on its club ground. Above it, the trail of
 * names it came through, oldest first. Under it, the burnt row: every crest
 * a pass has gone through this ball, struck out. The carrier's OPEN clubs
 * are never drawn here — knowing them is the game.
 */
export default function BallView({
  carrier, trail, burnt, clubs, shake, ballNo,
}: {
  carrier: Carrier;
  trail: Touch[];
  burnt: string[];
  clubs: Record<string, ClubView>;
  shake: boolean;
  ballNo: number;
}) {
  const last = trail[trail.length - 1];
  const through = last && last.via.length > 0 ? last.via : null;
  const before = trail.slice(0, -1);

  return (
    <section className="ball" aria-label={`Ball ${ballNo}`}>
      <div className="ball__trail" aria-label="How the ball got here">
        {before.length === 0 ? (
          <span className="ball__kickoff">Ball {ballNo} · kick-off</span>
        ) : (
          before.map((t, i) => (
            <span key={`${t.id}-${i}`} className="ball__touch">
              {i > 0 ? <span className="ball__arrow" aria-hidden>›</span> : null}
              {t.name}
            </span>
          ))
        )}
      </div>

      <div className="ball__carrier">
        <StickerFace
          key={carrier.id}
          player={carrier}
          image={carrier.image}
          ground={solid(carrier.ground)}
          className={`sticker--landing sticker--still ${shake ? 'sticker--shake' : ''}`}
        />
        {through ? (
          <div className="ball__through" key={`${carrier.id}-via`}>
            <span className="ball__through-label">through</span>
            {through.map((c) => (
              <span key={c} className="ball__via">
                <ClubBadge clubId={c} club={clubs[c]} size={22} />
                <b>{shortClubName(clubs[c]?.name ?? c)}</b>
              </span>
            ))}
          </div>
        ) : (
          <div className="ball__through ball__through--open">
            <span className="ball__through-label">every club open</span>
          </div>
        )}
      </div>

      <div className="burnt" aria-label="Clubs burnt this ball">
        <span className="burnt__label">Burnt</span>
        {burnt.length === 0 ? (
          <span className="burnt__none">none yet</span>
        ) : (
          burnt.map((c) => (
            <span key={c} className={`burnt__club ${through?.includes(c) ? 'is-new' : ''}`} title={clubs[c]?.name ?? c}>
              <ClubBadge clubId={c} club={clubs[c]} size={26} />
            </span>
          ))
        )}
      </div>
    </section>
  );
}
