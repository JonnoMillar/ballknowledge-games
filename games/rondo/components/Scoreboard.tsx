'use client';
import Bib from './Bib';
import { BIBS_OUT, type Side } from '../lib/match';

/**
 * Who is playing, how many bibs each has, and whose pass it is. The name
 * with the ball under it is the one the phone is waiting on.
 */
export default function Scoreboard({ players, turn, live }: { players: Side[]; turn: number; live: boolean }) {
  return (
    <ol className="score" aria-label="Scoreboard">
      {players.map((p, i) => {
        const out = p.bibs >= BIBS_OUT;
        const up = live && i === turn && !out;
        return (
          <li key={i} className={`score__side ${up ? 'is-up' : ''} ${out ? 'is-out' : ''}`}>
            <span className="score__name display">{p.name}</span>
            <span className="score__bibs" aria-label={`${p.bibs} of ${BIBS_OUT} bibs`}>
              {Array.from({ length: BIBS_OUT }, (_, k) => <Bib key={k} earned={k < p.bibs} size={15} className={k === p.bibs - 1 ? 'bib--new' : ''} />)}
            </span>
            {out ? <span className="score__out">In the middle</span> : up ? <span className="score__up">Your pass</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
