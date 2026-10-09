'use client';
import { useEffect, useState } from 'react';
import type { PlateMark } from '../../src/lib/chain/share';

/**
 * Prototype only: structured feedback on each example career, so a
 * playtest gives the generator something firmer than "easy" or "hard".
 *
 * Kept in this browser (localStorage) and handed over with one copy:
 * a JSON list to paste back into the session. The result and the clubs
 * picked are recorded by the game itself when a round ends.
 */
export interface Note {
  set: string;
  round: number;
  player: string;
  result?: PlateMark;
  picked?: string[];
  fake?: string;
  /** The real club the fake stood in for. */
  real?: string;
  knew?: 'yes' | 'vaguely' | 'no';
  /** How easy it looked before any pick: 1 very hard, 10 very easy. Locked at the reveal. */
  look?: number;
  /** How easy it was: 1 very hard, 10 very easy. */
  ease?: number;
  /** How much fun it was: 1 dull, 10 great. */
  fun?: number;
  note?: string;
}
type Store = Record<string, Note>;

const KEY = 'itk.feedback.v1';
const keyOf = (set: string, round: number) => `${set}:${round}`;

export function useFeedback() {
  const [store, setStore] = useState<Store>({});
  useEffect(() => {
    try { setStore(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store); } catch { /* private window: start empty */ }
  }, []);
  function update(set: string, round: number, player: string, patch: Partial<Note>) {
    setStore((s) => {
      const k = keyOf(set, round);
      const next = { ...s, [k]: { ...s[k], set, round: round + 1, player, ...patch } };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* not kept; still copyable this visit */ }
      return next;
    });
  }
  return { store, get: (set: string, round: number) => store[keyOf(set, round)], update };
}

const KNEW = ['yes', 'vaguely', 'no'] as const;

export function FeedbackStrip({ value, revealed, onChange }: { value: Note | undefined; revealed: boolean; onChange: (patch: Partial<Note>) => void }) {
  const group = <K extends 'knew'>(label: string, field: K, options: readonly NonNullable<Note[K]>[]) => (
    <div className="itk-fb__group" role="group" aria-label={label}>
      <span className="itk-fb__label">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="itk-fb__chip"
          aria-pressed={value?.[field] === o}
          onClick={() => onChange({ [field]: value?.[field] === o ? undefined : o } as Partial<Note>)}
        >
          {o}
        </button>
      ))}
    </div>
  );
  const scale = (label: string, field: 'look' | 'ease' | 'fun', low: string, high: string, locked = false) => (
    <div className={`itk-fb__group ${locked ? 'is-locked' : ''}`} role="group" aria-label={`${label}, 1 ${low} to 10 ${high}`}>
      <span className="itk-fb__label">{label}</span>
      <span className="itk-fb__end">{low}</span>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className="itk-fb__chip itk-fb__chip--n"
          aria-pressed={value?.[field] === n}
          disabled={locked}
          onClick={() => onChange({ [field]: value?.[field] === n ? undefined : n })}
        >
          {n}
        </button>
      ))}
      <span className="itk-fb__end">{high}</span>
    </div>
  );
  return (
    <aside className="itk-fb" aria-label="Prototype feedback">
      {group('Knew him', 'knew', KNEW)}
      {scale('First look', 'look', 'hard', 'easy', revealed)}
      {revealed ? scale('How easy', 'ease', 'hard', 'easy') : null}
      {revealed ? scale('Fun', 'fun', 'dull', 'great') : null}
      <input
        className="itk-fb__note"
        type="text"
        placeholder="Anything else? (what tricked you, who you'd swap…)"
        value={value?.note ?? ''}
        onChange={(e) => onChange({ note: e.target.value })}
      />
    </aside>
  );
}

export function CopyFeedback({ store }: { store: Store }) {
  const [copied, setCopied] = useState(false);
  const notes = Object.values(store).sort((a, b) => a.set.localeCompare(b.set) || a.round - b.round);
  async function copy() {
    await navigator.clipboard?.writeText(JSON.stringify(notes, null, 1)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button type="button" className="itk-proto__set itk-proto__copy" onClick={copy} disabled={notes.length === 0}>
      {copied ? 'Copied' : `Copy feedback (${notes.length})`}
    </button>
  );
}
