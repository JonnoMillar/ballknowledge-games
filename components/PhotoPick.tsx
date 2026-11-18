'use client';
import { useEffect, useRef, useState } from 'react';
import { StickerFace, neutral } from './Sticker';
import { kitCard } from '../src/lib/portraits';

export interface PickItem { id: string; name: string; rank: number; club?: string; alts: { k: number; file: string; year: number; current?: boolean }[] }
type Choice = number | 'kit';

/**
 * Dev only (/photo-pick): one row per player marked wrong, with the alternatives the pipeline cut
 * and the kit card. Click one; the picked card carries an ink frame and the word PICKED. Only a picked
 * photo ships: a player left unpicked gets the kit card (only checked photos go on the site). Saves as
 * you go to .scratch/photo-all/choices.json, which publish.py reads.
 */
export default function PhotoPick({ items, waiting }: { items: PickItem[]; waiting: number }) {
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const ready = useRef(false);
  useEffect(() => {
    fetch('/api/photo-check').then((r) => r.json()).then((m: { choices: Record<string, Choice> }) => { setChoices(m.choices); ready.current = true; }).catch(() => {});
  }, []);

  const pick = (id: string, value: Choice) => {
    if (!ready.current) return;
    const same = choices[id] === value;
    setChoices((c) => {
      const next = { ...c };
      if (same) delete next[id];
      else next[id] = value;
      return next;
    });
    fetch('/api/photo-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pick: { id, value: same ? null : value } }) }).catch(() => {});
  };

  return (
    <main className="pc">
      <div className="pc__bar">
        <strong>{items.length} players to pick for</strong>
        <span>{Object.keys(choices).length} picked</span>
        <span>{waiting} still being cut</span>
      </div>
      <p className="pc__help">Click the photo you want, or the kit card. Click again to undo. A player you leave alone gets the kit card, unless one card says ON SITE NOW: that photo stays. Reload to see more as they finish.</p>
      {items.map((it) => {
        const options: { k: Choice; file?: string; year?: number; current?: boolean }[] = [...it.alts.map((a) => ({ k: a.k as Choice, file: a.file, year: a.year, current: a.current })), { k: 'kit' }];
        return (
          <section key={it.id} className="pp__row">
            <h2 className="pp__name">{it.rank}. {it.name}</h2>
            <ul className="pp__opts">
              {options.map((o) => (
                <li key={String(o.k)}>
                  <button type="button" className={`pc__card ${choices[it.id] === o.k ? 'is-wrong' : ''}`} aria-pressed={choices[it.id] === o.k} onClick={() => pick(it.id, o.k)} title={o.file ? `${o.file} (${o.year ?? '?'})` : 'Kit card'}>
                    <StickerFace
                      player={{ id: it.id, name: it.name }}
                      image={o.file ? { url: `/api/photo-check/img/${it.id}.${o.k}.webp`, fit: 'box' } : kitCard(it.club)}
                      ground={neutral()}
                      className="sticker--still"
                      flag={false}
                    />
                    <span className="pc__flag">{choices[it.id] === o.k ? 'PICKED' : o.k === 'kit' ? 'KIT' : o.current ? 'ON SITE NOW' : `${(o.k as number) + 1}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
