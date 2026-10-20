'use client';
import { useState } from 'react';
import type { Options } from '../lib/match';
import { smooth } from '../../../src/lib/motion';

const MAX_PLAYERS = 6;

/**
 * Who's playing, which years, and whether the faker gets help. The last
 * names and options come back next time, because it is the same mates.
 * It sits on the front page's lit ground; Kick off is the page's red button.
 */
export default function Setup({
  initialNames, initialOptions, years, onStart,
}: {
  initialNames: string[];
  initialOptions: Options;
  years: { first: number; last: number };
  onStart: (names: string[], options: Options) => void;
}) {
  // Each row keeps its own key, so removing one lets the others slide up.
  const [rows, setRows] = useState(() => (initialNames.length >= 2 ? initialNames : ['', '']).map((name, i) => ({ id: i, name })));
  const [opts, setOpts] = useState<Options>(initialOptions);
  const [tip, setTip] = useState(false);
  const names = rows.map((r) => r.name);
  const all = Array.from({ length: years.last - years.first + 1 }, (_, i) => years.first + i);

  const set = (i: number, v: string) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, name: v } : r)));
  const remove = (i: number) => void smooth(() => setRows((rs) => rs.filter((_, k) => k !== i)));
  const add = () => void smooth(() => setRows((rs) => (rs.length < MAX_PLAYERS ? [...rs, { id: Math.max(...rs.map((r) => r.id)) + 1, name: '' }] : rs)));

  return (
    <form
      className="bf-setup"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(names.map((n, i) => n.trim() || `Player ${i + 1}`), opts);
      }}
    >
      <h2 className="bf-setup__title vt">Who’s playing?</h2>
      <ol className="bf-setup__names">
        {names.map((n, i) => (
          <li key={rows[i]!.id} className="bf-setup__row vt">
            <span className="bf-setup__no display">{i + 1}</span>
            <input
              className="bf-setup__input"
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
              <button type="button" className="bf-setup__remove" onClick={() => remove(i)} aria-label={`Remove player ${i + 1}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {names.length < MAX_PLAYERS ? (
        <button type="button" className="lobby-quiet lobby-small bf-setup__add vt" onClick={add}>+ One more</button>
      ) : null}

      <div className="bf-setup__opt vt">
        <span className="bf-setup__label">Matches</span>
        <span className="bf-years">
          <select aria-label="From" value={opts.from} onChange={(e) => setOpts((o) => ({ ...o, from: +e.target.value }))}>
            {all.filter((y) => y <= opts.to).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span aria-hidden>to</span>
          <select aria-label="To" value={opts.to} onChange={(e) => setOpts((o) => ({ ...o, to: +e.target.value }))}>
            {all.filter((y) => y >= opts.from).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </span>
      </div>

      <div className="bf-setup__opt vt">
        <span className="bf-setup__label">
          Help the faker
          <button
            type="button"
            className="bf-info"
            aria-expanded={tip}
            aria-controls="bf-help-tip"
            aria-label="What does Help the faker do?"
            onClick={() => setTip((t) => !t)}
          >i</button>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={opts.help}
          aria-label="Help the faker"
          className={`bf-switch${opts.help ? ' is-on' : ''}`}
          onClick={() => setOpts((o) => ({ ...o, help: !o.help }))}
        >
          <span className="bf-switch__knob" />
        </button>
      </div>
      <div className={`bf-tip${tip ? ' is-open' : ''}`} id="bf-help-tip" role="note">
        <div><p>The faker gets a few suggested players that make sense for each position.</p></div>
      </div>

      <button type="submit" className="lobby-play vt">Kick off</button>
    </form>
  );
}
