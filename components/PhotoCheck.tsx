'use client';
import { useEffect, useRef, useState } from 'react';
import { StickerFace, neutral } from './Sticker';

export interface CheckItem { id: string; name: string; rank: number; club?: string; cutout: boolean; file?: string; year?: number }
export interface CheckStats { approved: number; wrong: number; left: number; kit: number }

const FILTERS = [['all', 'All'], ['wrong', 'Marked wrong'], ['right', 'Not marked']] as const;
type Filter = (typeof FILTERS)[number][0];

/**
 * Dev only (/photo-check): the next batch of cutouts to check. Click a card whose photo is wrong
 * (not him, a suit, hands over the face, other people, a bad crop). Marked cards carry an ink frame
 * and the word WRONG (no colour to tell them apart). Marks save as you go. "Approve the rest" records
 * every unmarked card in the batch as checked (only checked photos ship) and loads the next batch;
 * the marked ones go on to /photo-pick, where the pipeline offers alternatives.
 */
export default function PhotoCheck({ items, stats }: { items: CheckItem[]; stats: CheckStats }) {
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const ready = useRef(false);
  const inBatch = new Set(items.map((i) => i.id));

  useEffect(() => {
    fetch('/api/photo-check').then((r) => r.json()).then((m: { wrong: string[]; flagged: string[] }) => { setWrong(new Set([...m.wrong, ...m.flagged])); ready.current = true; }).catch(() => {});
  }, []);

  const toggle = (id: string) => {
    if (!ready.current) return;
    const next = new Set(wrong);
    if (!next.delete(id)) next.add(id);
    setWrong(next);
    setSaved(false);
    fetch('/api/photo-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wrong: [...next] }) })
      .then((r) => setSaved(r.ok)).catch(() => setSaved(false));
  };

  const approveRest = () => {
    if (!ready.current || !saved || busy) return;
    setBusy(true);
    const ok = items.filter((i) => !wrong.has(i.id)).map((i) => i.id);
    fetch('/api/photo-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approve: ok }) })
      .then((r) => { if (r.ok) location.reload(); else setBusy(false); }).catch(() => setBusy(false));
  };

  const marked = items.filter((i) => wrong.has(i.id)).length;
  const shown = items.filter((i) => filter === 'all' || (filter === 'wrong') === wrong.has(i.id));

  return (
    <main className="pc">
      <div className="pc__bar">
        <strong>Batch of {items.length}</strong>
        <span>{marked} marked wrong</span>
        <span>{saved ? 'Saved' : 'Not saved'}</span>
        <span>{stats.left} left to check, {stats.approved} approved, {stats.wrong} wrong so far</span>
        <span className="pc__group" role="group" aria-label="Show">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={`gprev__btn ${filter === id ? 'is-on' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
          <button type="button" className="gprev__btn is-on" disabled={!items.length || busy} onClick={approveRest}>
            {busy ? 'Saving...' : `Approve the other ${items.length - marked}, next batch`}
          </button>
        </span>
      </div>
      <p className="pc__help">Most viewed first. Click a card if the photo is wrong: not him, a suit, hands over the face, other people in the frame, a mural, a bad crop. Click again to undo. Only photos you approve go on the site; the ones you mark get alternatives on the pick page, or the kit card. {stats.kit ? `${stats.kit} more players have no usable photo yet and show the kit card.` : ''}</p>
      {!items.length ? <p className="pc__help"><strong>Nothing left to check right now.</strong> The pipeline is still cutting; come back later.</p> : null}
      <ul className="pc__grid">
        {shown.filter((i) => inBatch.has(i.id)).map((i) => (
          <li key={i.id}>
            <button type="button" className={`pc__card ${wrong.has(i.id) ? 'is-wrong' : ''}`} aria-pressed={wrong.has(i.id)} onClick={() => toggle(i.id)} title={`${i.rank}. ${i.name}: ${i.file ?? ''} (${i.year ?? '?'})`}>
              <StickerFace player={{ id: i.id, name: i.name }} image={{ url: `/api/photo-check/img/${i.id}.0.webp`, fit: 'box' }} ground={neutral()} className="sticker--still" />
              <span className="pc__flag">{wrong.has(i.id) ? 'WRONG' : `${i.rank}`}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
