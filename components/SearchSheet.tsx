'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Sticker, { neutral } from './Sticker';
import { search, type SearchIndex } from '../src/lib/search/index';
import type { NameEntry } from '../src/lib/chain/client';

/**
 * The search sheet: where a slot gets its player.
 *
 * Tap an empty sticker and this slides up (a bottom sheet on a phone, a
 * panel on the right on a desk). Type a name, tap the sticker that comes
 * back, and it is on the board. One surface for one decision; the bench,
 * the shortlist and the Place button it replaces were three.
 *
 * Search only. No suggestions, no recent searches, no default results. The
 * album is searched, never listed: any name shown beside an open slot is an
 * answer to it, and on a chain a blank has two neighbours, so one leaked
 * name is the whole puzzle. `search()` returns [] for an empty query and
 * this component adds nothing of its own.
 */
export default function SearchSheet({
  slot, between, current, index, taken, onPick, onRemove, onClose,
}: {
  /** The slot being filled. Null closes the sheet. */
  slot: number | null;
  /** The names either side of the slot, for the subtitle. */
  between: string[];
  /** Who is in the slot now, if anyone. */
  current: NameEntry | null;
  /** Null while the album is still loading. */
  index: SearchIndex<NameEntry> | null;
  /** Ids already on the board, which cannot be picked again. */
  taken: ReadonlySet<string>;
  onPick: (id: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const open = slot !== null;
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (index ? search(index, query, 18) : []), [index, query]);

  // A fresh query for every slot, and the keyboard up straight away.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [open, slot]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const first = results.find((p) => !taken.has(p.id));

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden />
      <section className="finder" role="dialog" aria-modal="true" aria-label={`Choose a player for slot ${slot + 1}`}>
        <header className="finder__head">
          <div>
            <div className="finder__title display">Slot {slot + 1}</div>
            <div className="finder__sub">
              {between.length === 2
                ? <>Between <b>{between[0]}</b> and <b>{between[1]}</b></>
                : between.length === 1
                  ? <>Next to <b>{between[0]}</b></>
                  : null}
            </div>
          </div>
          <button type="button" className="finder__close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </header>

        <div className="finder__search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4.5-4.5" />
          </svg>
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={index ? 'Name a player' : 'Loading the album…'}
            disabled={!index}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-label="Name a player"
            // Enter takes the first result, so a name typed in full is one
            // keystroke from the board.
            onKeyDown={(e) => { if (e.key === 'Enter' && first) { e.preventDefault(); onPick(first.id); } }}
          />
        </div>

        <div className="finder__body">
          {query.trim() === '' ? (
            <p className="finder__empty">
              Type a name. Nothing is suggested: the album holds {index ? index.length.toLocaleString() : 'every'} players and the recall is the game.
            </p>
          ) : results.length === 0 ? (
            <p className="finder__empty">Nobody by that name in the album. Try a surname on its own.</p>
          ) : (
            <div className="finder__grid">
              {results.map((p) => {
                const inChain = taken.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="result"
                    disabled={inChain}
                    onClick={() => onPick(p.id)}
                    aria-label={inChain ? `${p.name}, already on the board` : `Place ${p.name}`}
                  >
                    <Sticker player={p} image={p.image} ground={neutral()} />
                    <span className="result__name">{p.name}</span>
                    {inChain ? <span className="result__taken">On the board</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {current ? (
          <footer className="finder__foot">
            <span>{current.name} is here now.</span>
            <button type="button" className="finder__remove" onClick={onRemove}>Take off the board</button>
          </footer>
        ) : null}
      </section>
    </>
  );
}
