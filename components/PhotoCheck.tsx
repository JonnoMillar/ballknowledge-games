'use client';
import { useEffect, useRef, useState } from 'react';
import { StickerFace, neutral } from './Sticker';

export interface CheckItem {
  id: string; name: string; rank: number; club?: string; cutout: boolean; file?: string; year?: number;
  /** scripts/photos/screen.py: 0..1 how likely he marks it, its suggested tags and why. Absent: not screened yet. */
  suspect?: number; suggest?: string[]; why?: Record<string, string>;
}
export interface CheckStats { approved: number; wrong: number; left: number; kit: number }

/** The tags, in the order of the number keys 1-9. Soft tags still ship until something better is picked; the rest block. */
export const TAGS = [
  { id: 'training', label: 'In training kit', soft: true },
  { id: 'notkit', label: 'Not in kit', soft: false },
  { id: 'lowq', label: 'Low quality', soft: false },
  { id: 'crop', label: 'Bad crop', soft: false },
  { id: 'unusable', label: 'Unusable', soft: false },
  { id: 'better', label: 'Must be a better option', soft: true },
  { id: 'nothim', label: 'Not him', soft: false },
  { id: 'messy', label: 'Messy cutout', soft: false },
  { id: 'old', label: 'Too old', soft: false },
] as const;
const SOFT = new Set<string>(TAGS.filter((t) => t.soft).map((t) => t.id));
const LABEL = Object.fromEntries(TAGS.map((t) => [t.id, t.label]));
const blocks = (tags: string[]) => tags.some((t) => !SOFT.has(t));

const FILTERS = [['all', 'All'], ['tagged', 'Tagged'], ['plain', 'No tags']] as const;
type Filter = (typeof FILTERS)[number][0];

const post = (body: unknown) => fetch('/api/photo-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/**
 * Dev only (/photo-check): the next batch of cutouts to check, suspects first (scripts/photos/screen.py).
 * Hover a card: text buttons over the photo toggle its tags (a card can carry several); the number keys 1-9 do the
 * same while hovering, 0 = fine (clears), A = keep the suggested tags. Tags the screen suggests show dashed with a "?"
 * until he confirms or changes them; nothing the screen suggests is saved or shipped by itself. A blocking tag
 * (everything but the two soft ones) keeps the photo off the site; soft tags still ship. "Approve" records every card
 * without a blocking tag as checked (only checked photos ship) and loads the next batch. No colour carries meaning:
 * blocked cards have a heavy frame and the word BLOCKED, tags are words, chosen ones are filled and ticked.
 */
export default function PhotoCheck({ items, stats, cut, screened }: { items: CheckItem[]; stats: CheckStats; cut: number; screened: number }) {
  const [saved, setSaved] = useState<Record<string, string[]>>({});   // his confirmed tags per card ([] = looked, fine)
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const ready = useRef(false);
  const live = useRef({ hover, saved });
  live.current = { hover, saved };
  const byId = new Map(items.map((i) => [i.id, i]));

  useEffect(() => {
    fetch('/api/photo-check').then((r) => r.json()).then((m: { tags?: Record<string, string[]> }) => { setSaved(m.tags ?? {}); ready.current = true; }).catch(() => {});
  }, []);

  /** What a card carries now: his tags if he has touched it, else what the screen suggests. */
  const tagsOf = (id: string): string[] => (saved[id] ?? byId.get(id)?.suggest ?? []);
  const touched = (id: string) => id in saved;

  const set = (id: string, tags: string[]) => {
    if (!ready.current) return;
    setSaved((s) => ({ ...s, [id]: tags }));
    setOk(false);
    post({ id, tags }).then((r) => setOk(r.ok)).catch(() => setOk(false));
  };
  const toggle = (id: string, tag: string) => {
    const now = live.current.saved[id] ?? byId.get(id)?.suggest ?? [];
    set(id, TAGS.map((t) => t.id).filter((t) => (t === tag ? !now.includes(t) : now.includes(t))));
  };

  // Number keys while hovering (or focused in) a card.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const id = live.current.hover;
      if (!id || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (/^[1-9]$/.test(e.key)) toggle(id, TAGS[Number(e.key) - 1]!.id);
      else if (e.key === '0') set(id, []);
      else if (e.key.toLowerCase() === 'a') set(id, byId.get(id)?.suggest ?? []);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const suggestedOnly = items.filter((i) => !touched(i.id) && (i.suggest?.length ?? 0) > 0);
  const acceptAll = () => { for (const i of suggestedOnly) set(i.id, i.suggest ?? []); };

  const approve = () => {
    if (!ready.current || !ok || busy) return;
    setBusy(true);
    const ids = items.filter((i) => !blocks(tagsOf(i.id))).map((i) => i.id);
    const approveTags = Object.fromEntries(ids.filter((id) => !touched(id) && tagsOf(id).length).map((id) => [id, tagsOf(id)]));
    post({ approve: ids, approveTags }).then((r) => { if (r.ok) location.reload(); else setBusy(false); }).catch(() => setBusy(false));
  };

  const blocked = items.filter((i) => touched(i.id) && blocks(tagsOf(i.id))).length;
  const undecided = items.filter((i) => !touched(i.id) && blocks(i.suggest ?? [])).length;
  const approvable = items.length - blocked - undecided;
  const shown = items.filter((i) => filter === 'all' || (filter === 'tagged') === (tagsOf(i.id).length > 0));
  const suspects = shown.filter((i) => (i.suspect ?? 0) >= cut);
  const fine = shown.filter((i) => (i.suspect ?? 0) < cut);

  const card = (i: CheckItem) => {
    const tags = tagsOf(i.id);
    const suggested = !touched(i.id) && tags.length > 0;
    const block = blocks(tags) && !suggested;   // a suggestion is not a block until he acts on it
    const title = [`${i.rank}. ${i.name}: ${i.file ?? ''} (${i.year ?? '?'})`, i.suspect !== undefined ? `suspect ${i.suspect.toFixed(2)}` : 'not screened yet', ...Object.entries(i.why ?? {}).map(([t, w]) => `${LABEL[t]}: ${w}`)].join('\n');
    return (
      <li key={i.id} className="pc__item" onMouseEnter={() => setHover(i.id)} onMouseLeave={() => setHover((h) => (h === i.id ? null : h))}
        onFocus={() => setHover(i.id)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover((h) => (h === i.id ? null : h)); }}>
        <div className={`pc__card ${block ? 'is-wrong' : suggested ? 'is-suggested' : tags.length ? 'is-soft' : ''}`} title={title}>
          <StickerFace player={{ id: i.id, name: i.name }} image={{ url: `/api/photo-check/img/${i.id}.0.webp`, fit: 'box' }} ground={neutral()} className="sticker--still" />
          <span className="pc__flag">{block ? 'BLOCKED' : suggested && blocks(tags) ? 'SUSPECT' : `${i.rank}`}</span>
          {tags.length ? <span className="pc__tagline">{tags.map((t) => LABEL[t]).join(', ')}{suggested ? ' ?' : ''}</span> : null}
          {hover === i.id ? (
            <span className="pc__tags" role="group" aria-label={`Tags for ${i.name}`}>
              {TAGS.map((t, n) => {
                const on = tags.includes(t.id);
                return (
                  <button key={t.id} type="button" className={`pc__tag ${on ? 'is-on' : ''} ${on && suggested ? 'is-suggested' : ''}`} aria-pressed={on} onClick={() => toggle(i.id, t.id)}>
                    <b>{n + 1}</b> {on ? (suggested ? '? ' : '✓ ') : ''}{t.label}{t.soft ? ' *' : ''}
                  </button>
                );
              })}
              <button type="button" className="pc__tag is-wide" onClick={() => set(i.id, [])}><b>0</b> Fine, no tags</button>
              {suggested ? <button type="button" className="pc__tag is-wide" onClick={() => set(i.id, i.suggest ?? [])}><b>A</b> Keep the suggestion</button> : null}
            </span>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <main className="pc">
      <div className="pc__bar">
        <strong>Batch of {items.length}</strong>
        <span>{blocked} blocked</span>
        <span>{ok ? 'Saved' : 'Not saved'}</span>
        <span>{stats.left} left to check, {stats.approved} approved, {stats.wrong} blocked so far</span>
        <span className="pc__group" role="group" aria-label="Show">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={`gprev__btn ${filter === id ? 'is-on' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
          {suggestedOnly.length ? <button type="button" className="gprev__btn" onClick={acceptAll}>Keep all {suggestedOnly.length} suggestions</button> : null}
          <button type="button" className="gprev__btn is-on" disabled={!items.length || busy} onClick={approve}>
            {busy ? 'Saving...' : `Approve the other ${approvable}, next batch`}
          </button>
        </span>
      </div>
      <p className="pc__help">
        Hover a card and tag what is wrong: click, or press 1-9 (0 = fine, A = keep the suggestion). Several tags are fine. <b>In training kit *</b> and <b>Must be a better option *</b> (the starred ones) still ship until something better is picked; every other tag keeps the photo off the site, and the pipeline looks for a replacement. A tag with a <b>?</b> is only the screen&apos;s guess: it is not saved until you act on it.
        {screened ? ` Suspects come first (${suspects.length}), likely fine last.` : ' Not screened yet: run scripts/photos/screen.py.'}
        {undecided ? ` ${undecided} suspects with a suggested blocking tag stay for next time unless you keep or clear their suggestion.` : ''}
        {stats.kit ? ` ${stats.kit} more players have no usable photo yet and show the kit card.` : ''}
      </p>
      {!items.length ? <p className="pc__help"><strong>Nothing left to check right now.</strong> The pipeline is still cutting; come back later.</p> : null}
      {suspects.length ? <h2 className="pc__h">Suspects ({suspects.length}), most likely first</h2> : null}
      <ul className="pc__grid">{suspects.map(card)}</ul>
      {screened && fine.length ? <h2 className="pc__h">Likely fine ({fine.length})</h2> : null}
      <ul className="pc__grid">{fine.map(card)}</ul>
    </main>
  );
}
