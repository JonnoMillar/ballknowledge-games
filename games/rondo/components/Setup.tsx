'use client';
import { useState } from 'react';
import { CLOCKS, type Clock } from '../lib/match';
import { smooth } from '../../../src/lib/motion';

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
  // Each row keeps its own key, so removing one lets the others slide up
  // rather than every name shifting a box.
  const [rows, setRows] = useState(() => (initialNames.length >= 2 ? initialNames : ['', '']).map((name, i) => ({ id: i, name })));
  const [clock, setClock] = useState<Clock>(initialClock);
  const names = rows.map((r) => r.name);

  const set = (i: number, v: string) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, name: v } : r)));
  const remove = (i: number) => void smooth(() => setRows((rs) => rs.filter((_, k) => k !== i)));
  const add = () => void smooth(() => setRows((rs) => (rs.length < MAX_PLAYERS ? [...rs, { id: Math.max(...rs.map((r) => r.id)) + 1, name: '' }] : rs)));

  return (
    <form
      className="setup"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(names.map((n, i) => n.trim() || `Player ${i + 1}`), clock);
      }}
    >
      <h2 className="setup__title vt">Who’s playing?</h2>
      <ol className="setup__names">
        {names.map((n, i) => (
          <li key={rows[i]!.id} className="setup__row vt">
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
        <button type="button" className="lobby-quiet lobby-small setup__add vt" onClick={add}>+ One more</button>
      ) : null}

      <div className="setup__clock vt" role="radiogroup" aria-label="Shot clock">
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

      <button type="submit" className="lobby-play vt">Kick off</button>
    </form>
  );
}
