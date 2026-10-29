'use client';
import ClubBadge, { shortClubName } from '../../../components/ClubBadge';
import Bib from './Bib';
import type { ClubView } from '../../../src/lib/clubs';
import { BIBS_OUT, type Loss, type Side } from '../lib/match';

/**
 * The ball is lost. Who lost it, why, and the "ahh": the clubs that were
 * open. Then the next ball — or, when someone has their third bib, full
 * time.
 */
export default function LossCard({
  loss, players, clubs, over, winnerIndex, onNext, onRematch, onNewGame,
}: {
  loss: Loss;
  players: Side[];
  clubs: Record<string, ClubView>;
  over: boolean;
  winnerIndex: number | null;
  onNext: () => void;
  onRematch: () => void;
  onNewGame: () => void;
}) {
  const loser = players[loss.by]!;
  const name = (c: string) => shortClubName(clubs[c]?.name ?? c);

  const why = (() => {
    switch (loss.reason) {
      case 'time': return <>Time.</>;
      case 'forfeit': return <>Nothing came.</>;
      case 'repeat': return <><b>{loss.target?.name}</b> has already had the ball.</>;
      case 'no-link': return <>No open club between <b>{loss.carrier.name}</b> and <b>{loss.target?.name}</b>.</>;
      case 'dead-end': return (
        <>
          Dead end. <b>{loss.target?.name}</b>
          {loss.via && loss.via.length > 0 ? <> through {loss.via.map(name).join(' and ')}</> : null}
          {' '}leaves nobody to pass to. Don’t name someone whose clubs are all burnt.
        </>
      );
      default: return <>The ref didn't know them.</>;
    }
  })();

  return (
    <section className="lost" role="dialog" aria-modal="true" aria-label={`${loser.name} loses the ball`}>
      <div className="lost__card">
        <div className="lost__bib"><Bib earned size={34} className="bib--new" /></div>
        <h2 className="lost__title display">
          {loser.name} <span>loses it</span>
        </h2>
        <p className="lost__why">{why}</p>

        {loss.open.length > 0 ? (
          <div className="lost__open">
            <div className="lost__open-label">
              <b>{loss.carrier.name}</b> was open through
            </div>
            <ul className="lost__clubs">
              {loss.open.map((c) => (
                <li key={c} className="lost__club">
                  <ClubBadge clubId={c} club={clubs[c]} size={30} />
                  <span>{name(c)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {over ? (
          <div className="lost__final">
            <div className="lost__ft display">Full time</div>
            <div className="lost__winner display">
              {winnerIndex !== null ? players[winnerIndex]!.name : '—'} <span>keeps the ball</span>
            </div>
            <ul className="lost__tally">
              {players.map((p, i) => (
                <li key={i}>
                  <span className="display">{p.name}</span>
                  <span className="lost__tally-bibs">
                    {Array.from({ length: BIBS_OUT }, (_, k) => <Bib key={k} earned={k < p.bibs} size={13} />)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="lost__actions">
              <button type="button" className="lobby-play" onClick={onRematch}>Rematch</button>
              <button type="button" className="lobby-quiet" onClick={onNewGame}>Change players</button>
            </div>
          </div>
        ) : (
          <div className="lost__actions">
            <button type="button" className="lobby-play" onClick={onNext}>
              Next ball
            </button>
            <span className="lost__kickoff">{loser.bibs < BIBS_OUT ? `${loser.name} kicks off` : `${loser.name} is in the middle`}</span>
          </div>
        )}
      </div>
    </section>
  );
}
