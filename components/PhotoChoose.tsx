'use client';
import { useEffect, useRef, useState } from 'react';

export interface ChooseOpt { n: string; file: string; year?: number; current?: boolean; note?: string }
export interface ChooseItem { id: string; name: string; rank: number; opts: ChooseOpt[] }
type Chosen = Record<string, string>;   // id -> candidate file, or 'kit'

/**
 * Dev only (/photo-choose): every realistic photo of each player, framed as the card will crop it, BEFORE anything is
 * cut out. Click the one to use, or "None good". Only the chosen photo is cut (scripts/photos/cutout.py reads
 * chosen.json); the cutout then waits for one last look on /photo-check or /photo-pick. Saves as you go.
 */
export default function PhotoChoose({ items }: { items: ChooseItem[] }) {
  const [chosen, setChosen] = useState<Chosen>({});
  const ready = useRef(false);
  useEffect(() => {
    fetch('/api/photo-check').then((r) => r.json()).then((m: { chosen?: Chosen }) => { setChosen(m.chosen ?? {}); ready.current = true; }).catch(() => {});
  }, []);

  const choose = (id: string, value: string) => {
    if (!ready.current) return;
    const same = chosen[id] === value;
    setChosen((c) => {
      const next = { ...c };
      if (same) delete next[id];
      else next[id] = value;
      return next;
    });
    fetch('/api/photo-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choose: { id, value: same ? null : value } }) }).catch(() => {});
  };

  const done = items.filter((it) => chosen[it.id]).length;
  return (
    <main className="pc">
      <div className="pc__bar">
        <strong>{items.length} players</strong>
        <span>{done} chosen</span>
        <span>{items.length - done} left</span>
      </div>
      <p className="pc__help">Click the photo to use: only that one is cut out. &quot;None good&quot; gives the kit card. Click again to undo. Each photo is framed the way the card will crop it.</p>
      {items.map((it) => (
        <section key={it.id} className={`pp__row ${chosen[it.id] ? 'is-done' : ''}`}>
          <h2 className="pp__name">{it.rank}. {it.name}</h2>
          <ul className="pp__opts">
            {it.opts.map((o) => {
              const on = chosen[it.id] === o.file;
              return (
                <li key={o.file}>
                  <button type="button" className={`ch__opt ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => choose(it.id, o.file)} title={`${o.file.replace(/^File:/, '')} (${o.year ?? '?'})`}>
                    <img src={`/api/photo-check/pre/${it.id}/${o.n}`} alt="" loading="lazy" width={160} height={160} />
                    <span className="pc__flag">{on ? 'CHOSEN' : o.current ? 'ON SITE NOW' : (o.year ?? '')}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button type="button" className={`ch__opt ch__none ${chosen[it.id] === 'kit' ? 'is-on' : ''}`} aria-pressed={chosen[it.id] === 'kit'} onClick={() => choose(it.id, 'kit')}>
                <span>{it.opts.length ? 'None good' : 'No photo found'}</span>
                {chosen[it.id] === 'kit' ? <span className="pc__flag">CHOSEN</span> : null}
              </button>
            </li>
          </ul>
        </section>
      ))}
    </main>
  );
}
