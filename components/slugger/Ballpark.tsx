'use client';
import type { SearchIndex } from '../../src/lib/search/index';
import type { NameEntry } from '../../src/lib/chain/client';
import { batter, phase, type Match, type Pitch, type Settings } from '../../src/lib/slugger/match';
import Masthead from './Masthead';
import LineScore from './LineScore';
import Diamond from './Diamond';
import Hand from './Hand';
import AtBat from './AtBat';
import CallCard from './CallCard';
import FullTime from './FullTime';

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
export const inningName = (n: number) => ORDINAL[n - 1] ?? `${n}th`;

/**
 * The ballpark: the scoreboard, the diamond, and the panel that changes.
 *
 * One column, phone first. The scoreboard and the diamond are always up;
 * below them is whichever of the four things is happening — the pitcher's
 * hand, the at-bat, the umpire's call, or full time.
 */
export default function Ballpark({
  match, settings, index, busy, trouble,
  onPitch, onSwing, onStrike, onNext, onRematch, onQuit, onRetry,
}: {
  match: Match;
  settings: Settings;
  index: SearchIndex<NameEntry> | null;
  busy: boolean;
  trouble: string | null;
  onPitch: (p: Pitch) => void;
  onSwing: (e: NameEntry) => void;
  onStrike: (reason: 'clock' | 'nothing') => void;
  onNext: () => void;
  onRematch: () => void;
  onQuit: () => void;
  onRetry: () => void;
}) {
  const ph = phase(match);
  const up = batter(match);
  const fielder = match.sides[up.side === 0 ? 1 : 0];

  return (
    <div className="slug-shell">
      <Masthead>
        <span className="pill">
          {match.status === 'over' ? 'Final' : `${match.half === 'top' ? '▲' : '▼'} ${inningName(match.inning)}`}
        </span>
        <button type="button" className="slug-quit" onClick={() => { if (confirm('Abandon this game?')) onQuit(); }}>Quit</button>
      </Masthead>

      <main className="slug-main slug-main--park">
        <LineScore match={match} />
        <Diamond match={match} />

        {trouble ? (
          <div className="slug-trouble" role="alert">
            <span>{trouble}</span>
            <button type="button" className="slug-btn" onClick={onRetry}>Retry</button>
          </div>
        ) : null}

        <section className="slug-panel" aria-live="polite">
          {ph === 'call' && match.call ? (
            <CallCard match={match} call={match.call} onNext={onNext} />
          ) : ph === 'over' ? (
            <FullTime match={match} onRematch={onRematch} onQuit={onQuit} />
          ) : ph === 'swing' && match.pitch ? (
            <AtBat
              key={`${match.pitched.length}-${match.strikes}`}
              pitch={match.pitch}
              batter={up.name}
              side={match.sides[up.side].name}
              clock={settings.clock}
              index={index}
              busy={busy}
              onSwing={onSwing}
              onStrike={onStrike}
            />
          ) : (
            <Hand
              hand={ph === 'pitch' ? match.hand : null}
              lastKind={match.lastKind}
              pitcher={fielder.name}
              batter={up.name}
              onPitch={onPitch}
            />
          )}
        </section>
      </main>
    </div>
  );
}
