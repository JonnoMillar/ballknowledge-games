'use client';
import { useState } from 'react';
import { CLOCKS, type Clock } from '../lib/match';

const MAX_PLAYERS = 4;

/**
 * Who's playing, and how long they get. Two names by default, up to four.
 * The last names used come back next time, because it is the same mates.
 * It sits on the front page's lit ground; Kick off is the page's red button.
 */
export default function Setup({
  initialNames, initialClock, onStart,
}: {
  initialNames: string[];
  initialClock: Clock;
  onStart: (names: string[], clock: Clock) => void;
}) {
  const [names, setNames] = useState<string[]>(initialNames.length >= 2 ? initialNames : ['', '']);
  const [clock, setClock] = useState<Clock>(initialClock);

  const set = (i: number, v: string) => setNames((ns) => ns.map((n, k) => (k === i ? v : n)));
  const remove = (i: number) => setNames((ns) => ns.filter((_, k) => k !== i));
  const add = () => setNames((ns) => (ns.length < MAX_PLAYERS ? [...ns, ''] : ns));

  return (
    <form
      className="setup"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(names.map((n, i) => n.trim() || `Player ${i + 1}`), clock);
      }}
    >
      <h2 className="setup__title">Who’s playing?</h2>
      <ol className="setup__names">
        {names.map((n, i) => (
          <li key={i} className="setup__row">
            <span className="setup__no display">{i + 1}</span>
            <input
              className="setup__input"
              value={n}
              onChange={(e) => set(i, e.target.value)}
              placeholder={i === 0 ? 'You' : i === 1 ? 'Your mate' : 'Another'}
              maxLength={16}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              aria-label={`Player ${i + 1} name`}
            />
            {names.length > 2 ? (
              <button type="button" className="setup__remove" onClick={() => remove(i)} aria-label={`Remove player ${i + 1}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {names.length < MAX_PLAYERS ? (
        <button type="button" className="setup__add" onClick={add}>+ One more</button>
      ) : null}

      <div className="setup__clock" role="radiogroup" aria-label="Shot clock">
        <span className="setup__label">Clock</span>
        <div className="seg">
          {CLOCKS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={clock === c}
              className={`seg__opt ${clock === c ? 'is-on' : ''}`}
              onClick={() => setClock(c)}
            >
              {c === 0 ? 'Off' : `${c}s`}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="lobby-play display">Kick off</button>
    </form>
  );
}
