'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { search, type SearchIndex } from '../../../src/lib/search/index';
import type { NameEntry } from '../../../src/lib/chain/client';

/**
 * The pass. Whose it is, the clock, a name typed, the name confirmed.
 *
 * Two taps, deliberately: a result is picked, then the pass is made with
 * the big orange button. One wrong pass costs the ball, so a mis-tap on a
 * list must not. Enter picks the first result; it never passes.
 *
 * Search only, as everywhere in the album: nothing is listed until a name
 * is typed, and the results are names — no clubs, no fame.
 */
export default function PassBox({
  who, passKey, index, secondsLeft, clock, busy, taken, onPass, onGiveUp,
}: {
  who: string;
  /** Changes with every pass, so the field is cleared for each one. */
  passKey: string;
  index: SearchIndex<NameEntry> | null;
  /** Null when the clock is off. */
  secondsLeft: number | null;
  clock: number;
  busy: boolean;
  taken: ReadonlySet<string>;
  onPass: (id: string, name: string) => void;
  onGiveUp: () => void;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<NameEntry | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (index ? search(index, query, 8) : []), [index, query]);

  // A fresh field for every pass.
  useEffect(() => {
    setQuery('');
    setPicked(null);
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(t);
  }, [passKey]);

  const first = results.find((p) => !taken.has(p.id)) ?? null;
  const urgent = secondsLeft !== null && secondsLeft <= 5;
  const fraction = secondsLeft !== null && clock > 0 ? secondsLeft / clock : 1;

  return (
    <section className={`pass ${busy ? 'is-busy' : ''}`} aria-label="Your pass">
      <header className="pass__head">
        <div>
          <div className="pass__who display">{who}</div>
          <div className="pass__sub">your pass</div>
        </div>
        {secondsLeft !== null ? (
          <div className={`clock ${urgent ? 'is-urgent' : ''}`} role="timer" aria-live={urgent ? 'assertive' : 'off'} aria-label={`${secondsLeft} seconds`}>
            <svg viewBox="0 0 40 40" width="52" height="52" aria-hidden>
              <circle cx="20" cy="20" r="17" fill="none" stroke="var(--rule)" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="17" fill="none"
                stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 17}`}
                strokeDashoffset={`${2 * Math.PI * 17 * (1 - fraction)}`}
                transform="rotate(-90 20 20)"
                style={{ transition: 'stroke-dashoffset 250ms linear' }}
              />
            </svg>
            <span className="clock__n display">{secondsLeft}</span>
          </div>
        ) : null}
      </header>

      {picked ? (
        <div className="pass__picked">
          <button type="button" className="pass__unpick" onClick={() => { setPicked(null); setTimeout(() => input.current?.focus(), 30); }} aria-label="Choose someone else">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <span className="pass__picked-name">{picked.name}</span>
          <button type="button" className="kick kick--pass display" disabled={busy} onClick={() => onPass(picked.id, picked.name)}>
            {busy ? 'Ref…' : 'Pass'}
          </button>
        </div>
      ) : (
        <>
          <div className="pass__search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4.5-4.5" />
            </svg>
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={index ? 'Name a player' : 'The ref is getting ready…'}
              disabled={!index || busy}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-label="Name a player"
              onKeyDown={(e) => { if (e.key === 'Enter' && first) { e.preventDefault(); setPicked(first); } }}
            />
          </div>
          {query.trim() !== '' ? (
            results.length === 0 ? (
              <p className="pass__empty">Nobody by that name in the album. Try a surname on its own.</p>
            ) : (
              <ul className="pass__results">
                {results.map((p) => {
                  const had = taken.has(p.id);
                  return (
                    <li key={p.id}>
                      <button type="button" className="pass__result" disabled={had} onClick={() => setPicked(p)}>
                        <span>{p.name}</span>
                        {had ? <span className="pass__had">had it</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </>
      )}

      <button type="button" className="pass__nothing" disabled={busy} onClick={onGiveUp}>
        I've got nothing
      </button>
    </section>
  );
}
