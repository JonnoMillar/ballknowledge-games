'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { search, type SearchIndex } from '../../../src/lib/search/index';
import type { NameEntry } from '../../../src/lib/chain/client';
import { canPlant } from '../lib/match';
import type { Named, Side, Slot } from '../lib/types';

/**
 * Who goes in. The slot being swapped and a search over every player, as
 * everywhere on the site: nothing is listed until a name is typed. The
 * faker's help is its own card tray (Help).
 */
export default function Swap({
  side, slot, index, chosen, onChoose,
}: {
  side: Side;
  slot: Slot;
  index: SearchIndex<NameEntry> | null;
  chosen: Named | null;
  onChoose: (p: Named) => void;
}) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (index ? search(index, query, 8) : []), [index, query]);

  // A fresh field for every slot.
  useEffect(() => { setQuery(''); }, [slot]);

  const choose = (p: Named) => { setQuery(''); onChoose(p); };

  return (
    <section className="bf-swap vt" aria-label="The swap">
      <p className="bf-swap__out">Out: <b>{slot.name}</b>{chosen ? <> · In: <b>{chosen.name}</b></> : null}</p>
      <div className="bf-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4.5-4.5" />
        </svg>
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={index ? 'Anyone at all' : 'Getting the players…'}
          disabled={!index}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label="Search for a player"
          onKeyDown={(e) => {
            const first = results.find((p) => canPlant(side, p));
            if (e.key === 'Enter' && first) { e.preventDefault(); choose(first); }
          }}
        />
      </div>
      {query.trim() !== '' ? (
        results.length === 0 ? (
          <p className="bf-swap__empty">Nobody by that name. Try a surname on its own.</p>
        ) : (
          <ul className="bf-results">
            {results.map((p) => {
              const on = !canPlant(side, p);
              return (
                <li key={p.id}>
                  <button type="button" className="bf-result" disabled={on} onClick={() => choose(p)}>
                    <span>{p.name}</span>
                    {on ? <span className="bf-result__note">in the XI</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </section>
  );
}
