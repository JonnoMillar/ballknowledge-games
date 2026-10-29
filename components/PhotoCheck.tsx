'use client';
import { useEffect, useRef, useState } from 'react';
import { StickerFace, neutral } from './Sticker';
import { kitCard } from '../src/lib/portraits';

export interface CheckItem { id: string; name: string; rank: number; club?: string; cutout: boolean; file?: string; year?: number }

const FILTERS = [['all', 'All'], ['wrong', 'Marked wrong'], ['right', 'Not marked']] as const;
type Filter = (typeof FILTERS)[number][0];

/**
 * Dev only (/photo-check): click a card whose photo is wrong. Marked cards carry an ink frame and
 * the word WRONG (no colour to tell them apart). Marks save as you go to .scratch/photo-all/marks.json;
 * the pipeline then cuts three alternatives for each marked player to pick from, or the kit card.
 */
export default function PhotoCheck({ items, waiting }: { items: CheckItem[]; waiting: number }) {
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [saved, setSaved] = useState(true);
  const ready = useRef(false);

  useEffect(() => {
    fetch('/api/photo-check').then((r) => r.json()).then((m: { wrong: string[] }) => { setWrong(new Set(m.wrong)); ready.current = true; }).catch(() => {});
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

  const cutouts = items.filter((i) => i.cutout);
  const shown = cutouts.filter((i) => filter === 'all' || (filter === 'wrong') === wrong.has(i.id));
  const kits = items.filter((i) => !i.cutout);

  return (
    <main className="pc">
      <div className="pc__bar">
        <strong>{cutouts.length} photos to check</strong>
        <span>{wrong.size} marked wrong</span>
        <span>{waiting} not cut out yet</span>
        <span>{saved ? 'Saved' : 'Not saved'}</span>
        <span className="pc__group" role="group" aria-label="Show">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={`gprev__btn ${filter === id ? 'is-on' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </span>
      </div>
      <p className="pc__help">Most viewed first. Click a card if the photo is wrong: not him, a suit, other people in the frame, a mural, a bad crop. Click again to undo.</p>
      <ul className="pc__grid">
        {shown.map((i) => (
          <li key={i.id}>
            <button type="button" className={`pc__card ${wrong.has(i.id) ? 'is-wrong' : ''}`} aria-pressed={wrong.has(i.id)} onClick={() => toggle(i.id)} title={`${i.rank}. ${i.name}: ${i.file ?? ''} (${i.year ?? '?'})`}>
              <StickerFace player={{ id: i.id, name: i.name }} image={{ url: `/api/photo-check/img/${i.id}.0.webp`, fit: 'box' }} ground={neutral()} className="sticker--still" />
              <span className="pc__flag">{wrong.has(i.id) ? 'WRONG' : `${i.rank}`}</span>
            </button>
          </li>
        ))}
      </ul>
      {kits.length ? (
        <>
          <h2 className="pc__h">No usable photo: these get the kit card ({kits.length})</h2>
          <ul className="pc__grid">
            {kits.map((i) => (
              <li key={i.id}><StickerFace player={{ id: i.id, name: i.name }} image={kitCard(i.club)} ground={neutral()} className="sticker--still" /></li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
