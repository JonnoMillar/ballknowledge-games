'use client';
import { batting, total, type Match } from '../../src/lib/slugger/match';

/**
 * The line score: the board at the ballpark.
 *
 * Runs per inning for each side, then R, H and O. A dash is a half not
 * played yet; the side batting now is marked. It is the one dark thing on
 * the page because that is what a scoreboard is — a green board with chalk
 * figures — not because the page is dark.
 */
export default function LineScore({ match }: { match: Match }) {
  const innings = match.runs[0].length;
  const now = batting(match);
  // A half has been reached if its inning is past, or it is this inning and
  // the top is done. The home side's skipped last half is an X, as on a real
  // board: it was ahead, so it never batted.
  const cell = (side: 0 | 1, i: number): string => {
    const inning = i + 1;
    const reached = inning < match.inning || (inning === match.inning && (side === 0 || match.half === 'bottom'));
    if (!reached) return match.status === 'over' && side === 1 && inning === match.inning ? 'X' : '–';
    return String(match.runs[side][i] ?? 0);
  };

  return (
    <div className="slug-board" role="table" aria-label="Line score">
      <div className="slug-board__scroll">
        <table className="slug-board__table display">
          <thead>
            <tr>
              <th className="slug-board__side" scope="col"><span className="sr-only">Side</span></th>
              {Array.from({ length: innings }, (_, i) => (
                <th key={i} scope="col" className={i + 1 === match.inning && match.status === 'live' ? 'is-now' : ''}>{i + 1}</th>
              ))}
              <th scope="col" className="slug-board__gap">R</th>
              <th scope="col">H</th>
              <th scope="col">O</th>
            </tr>
          </thead>
          <tbody>
            {([0, 1] as const).map((side) => (
              <tr key={side} className={now === side && match.status === 'live' ? 'is-batting' : ''}>
                <th scope="row" className="slug-board__side">
                  <span className="slug-board__arrow" aria-hidden="true">{now === side && match.status === 'live' ? '▶' : ''}</span>
                  {match.sides[side].name}
                </th>
                {Array.from({ length: innings }, (_, i) => (
                  <td key={i} className={i + 1 === match.inning && match.status === 'live' ? 'is-now' : ''}>{cell(side, i)}</td>
                ))}
                <td className="slug-board__gap slug-board__runs">{total(match, side)}</td>
                <td>{match.hits[side]}</td>
                <td>{match.outs[side]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
