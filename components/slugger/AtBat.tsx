'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ClubBadge, { shortClubName } from '../ClubBadge';
import { search, type SearchIndex } from '../../src/lib/search/index';
import type { NameEntry } from '../../src/lib/chain/client';
import type { Named, Pitch } from '../../src/lib/slugger/match';
import { BASES_FOR, BASES_NAME } from '../../src/lib/slugger/grade';
import { KIND_LABEL } from './Hand';

/**
 * The at-bat: the pitch at the plate, the clock, and the search.
 *
 * The batter says a name; whoever holds the phone types it and taps it.
 * Tapping is the swing — there is no confirm, because the clock is
 * running and this is a pub. A name already used is a foul: the line says
 * so and the batter swings again at the same pitch. The search shows
 * nothing until a name is typed: the album is searched, never listed, so
 * nothing beside the pitch is a list of its players.
 *
 * Mounted fresh for every pitch (keyed by the parent), so the clock and
 * the query start clean. A foul does not remount it: the clock runs on.
 */
export default function AtBat({
  pitch, batter, side, foul, clock, index, busy, onSwing, onOut,
}: {
  pitch: Pitch;
  batter: string;
  side: string;
  foul: Named | null;
  clock: number;
  index: SearchIndex<NameEntry> | null;
  busy: boolean;
  onSwing: (e: NameEntry) => void;
  onOut: (reason: 'clock' | 'nothing') => void;
}) {
  const [query, setQuery] = useState('');
  const [left, setLeft] = useState(clock);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (index ? search(index, query, 8) : []), [index, query]);
  const club = shortClubName(pitch.name);

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(t);
  }, []);

  // The clock. It runs from the moment the pitch is at the plate and stops
  // for nothing but the swing; at zero the umpire calls it: caught looking.
  const fired = useRef(false);
  useEffect(() => {
    if (clock <= 0) return;
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, clock - (Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0 && !fired.current) {
        fired.current = true;
        clearInterval(id);
        onOut('clock');
      }
    }, 100);
    return () => clearInterval(id);
  }, [clock, onOut]);

  const secs = Math.ceil(left);
  const urgent = clock > 0 && left <= 5;

  return (
    <div className={`slug-atbat${busy ? ' is-busy' : ''}`}>
      <div className="slug-plate">
        <div className="slug-plate__crest">
          <ClubBadge clubId={pitch.id} club={{ name: pitch.name, crest: pitch.crest }} size={64} />
        </div>
        <div className="slug-plate__text">
          <span className={`slug-plate__kind slug-plate__kind--${pitch.kind} display`}>{KIND_LABEL[pitch.kind]}</span>
          <span className="slug-plate__club display">{club}</span>
          <span className={`slug-plate__worth slug-plate__worth--${pitch.kind} display`}>{BASES_NAME[BASES_FOR[pitch.kind]]} if hit</span>
          <span className="slug-plate__who"><b>{batter}</b>{side !== batter ? <> · {side}</> : null}</span>
        </div>
        {clock > 0 ? (
          <div className={`slug-clock display${urgent ? ' is-urgent' : ''}`} aria-label={`${secs} seconds`}>
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="17" className="slug-clock__track" />
              <circle
                cx="20" cy="20" r="17" className="slug-clock__arc"
                strokeDasharray={`${(left / clock) * 106.8} 106.8`}
                transform="rotate(-90 20 20)"
              />
            </svg>
            <span>{secs}</span>
          </div>
        ) : null}
      </div>

      <label className="slug-search">
        <span className="sr-only">Name a {club} player</span>
        <input
          ref={input}
          className="slug-input slug-search__input"
          placeholder={index ? `Name a ${club} player…` : 'Loading the album…'}
          value={query}
          disabled={!index || busy}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="go"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) onSwing(results[0]); }}
        />
      </label>

      {foul ? (
        <p className="slug-foul" role="status">
          <b>Foul ball.</b> {foul.name} has already had a hit this match. Swing again.
        </p>
      ) : null}

      <ul className="slug-results" aria-live="polite">
        {results.map((r) => (
          <li key={r.id}>
            <button type="button" className="slug-result" disabled={busy} onClick={() => onSwing(r)}>
              <span className="slug-result__name">{r.name}</span>
              <span className="slug-result__go display">Swing</span>
            </button>
          </li>
        ))}
        {query.trim() && index && results.length === 0 ? (
          <li className="slug-results__none">Nobody by that name in the album.</li>
        ) : null}
      </ul>

      <div className="slug-atbat__foot">
        <button type="button" className="slug-link slug-link--muted" disabled={busy} onClick={() => onOut('nothing')}>
          I&rsquo;ve got nothing
        </button>
        {busy ? <span className="slug-atbat__busy">The umpire&rsquo;s looking…</span> : null}
      </div>
    </div>
  );
}
