'use client';
import { total, type Match, type Side } from '../../src/lib/slugger/match';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Dave wins" for a mate on their own; "The Lads win" for a side, as football has it. */
const wins = (s: Side) => (s.lineup.length === 1 && s.lineup[0] === s.name ? 'wins' : 'win');

/** Full time: who won, by how much, and the two ways on. */
export default function FullTime({ match, onRematch, onQuit }: { match: Match; onRematch: () => void; onQuit: () => void }) {
  const a = total(match, 0);
  const h = total(match, 1);
  const winner = match.winner;
  const extras = match.runs[0].length > match.settings.innings;
  return (
    <div className="slug-final" role="status">
      <span className="slug-final__eyebrow display">Final{extras ? ` · ${match.runs[0].length} innings` : ''}</span>
      <h2 className="slug-final__head display">
        {winner === null ? 'A tie' : `${match.sides[winner].name} ${wins(match.sides[winner])}`}
      </h2>
      <p className="slug-final__score display">
        <span>{match.sides[0].name} {a}</span>
        <span className="slug-final__dash">–</span>
        <span>{h} {match.sides[1].name}</span>
      </p>
      <p className="slug-final__line">
        {plural(match.hits[0] + match.hits[1], 'hit')}, {plural(match.strikeouts[0] + match.strikeouts[1], 'strikeout')}, {plural(match.used.length, 'name')}.
      </p>
      <div className="slug-final__actions">
        <button type="button" className="slug-btn slug-btn--primary display" onClick={onRematch}>Rematch — swap ends</button>
        <button type="button" className="slug-btn display" onClick={onQuit}>New game</button>
      </div>
    </div>
  );
}
