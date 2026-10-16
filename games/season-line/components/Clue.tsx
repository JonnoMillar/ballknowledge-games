'use client';
import { useState } from 'react';
import { crestPath } from '../../../src/lib/clubs';

/** A clue's glyph: a shirt for the squad player, a ball for the top scorer. */
export const Glyph = ({ kind }: { kind: 'squad' | 'top' }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
    {kind === 'squad'
      ? <path d="M8.5 3.5 3 6l2 4.5 2.5-1V20.5h9V9.5l2.5 1L21 6l-5.5-2.5a3.5 3.5 0 0 1-7 0Z" />
      : <><circle cx="12" cy="12" r="9" /><path d="m12 8 3.4 2.5-1.3 4h-4.2l-1.3-4Z" /><path d="M12 8V3.2M15.4 10.5l4.4-1.6M14.1 14.5l2.7 3.7M9.9 14.5l-2.7 3.7M8.6 10.5 4.2 8.9" /></>}
  </svg>
);

export const Crest = ({ q, size = 22 }: { q: string | null; size?: number }) => (q ? <img src={crestPath(q)} alt="" width={size} height={size} /> : null);

/**
 * A clue: a grey missing-sticker slot until a miss earns it, then a card
 * stuck down. `result` marks the bonus top scorer once it has been guessed.
 */
export function Clue({ kind, label, name, note, result }: { kind: 'squad' | 'top'; label: string; name: string | null; note?: string; result?: 'right' | 'wrong' }) {
  return name ? (
    <li className={`sl-clue is-on${result ? ` is-${result}` : ''}`}>
      <span className="sl-clue__glyph"><Glyph kind={kind} /></span>
      <span className="sl-clue__label">{result === 'right' ? 'Bonus' : result === 'wrong' ? 'Missed' : label}</span>
      <b className="sl-clue__name display">{name}</b>
      {note ? <span className="sl-clue__note">{note}</span> : null}
    </li>
  ) : (
    <li className="sl-clue" aria-label={`${label}, not yet`}>
      <span className="sl-clue__glyph"><Glyph kind={kind} /></span>
      <span className="sl-clue__label">{label}</span>
    </li>
  );
}

/** The top scorer slot once the board is solved before the clue was earned: one guess for a bonus. */
export function Bonus({ options, busy, onGuess }: { options: string[]; busy: boolean; onGuess: (name: string) => void }) {
  const [text, setText] = useState('');
  return (
    <li className="sl-clue sl-clue--bonus">
      <span className="sl-clue__glyph"><Glyph kind="top" /></span>
      <span className="sl-clue__label">Bonus</span>
      <form className="sl-bonus" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) onGuess(text); }}>
        <input className="sl-bonus__in" list="sl-scorers" value={text} onChange={(e) => setText(e.target.value)} placeholder="Top scorer?"
          aria-label="Top scorer, for a bonus" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={60} />
        <button type="submit" className="sl-bonus__go" aria-label="Guess the top scorer" disabled={!text.trim() || busy}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
        </button>
        <datalist id="sl-scorers">{options.map((o) => <option key={o} value={o} />)}</datalist>
      </form>
    </li>
  );
}
