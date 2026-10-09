'use client';
import { useEffect, useState } from 'react';
import { PinLogo } from './PitchPin';
import { packStatus, readStore, type Store } from '../lib/progress';
import { againstPar, tally, type Mode } from '../lib/score';
import type { PackCard, Shelf } from '../lib/types';

/**
 * The library: packs on shelves. The shelves come from the server; what this
 * browser has played is filled in after mount, since localStorage is not on
 * the server.
 */
export default function Library({ shelves, mode }: { shelves: Shelf[]; mode: Mode }) {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => setStore(readStore()), []);
  const query = mode === 'points' ? '?score=points' : '';
  return (
    <div className="app pin">
      <header className="masthead">
        <a className="masthead__brand display" href={`/pin${query}`}>
          <PinLogo />
          Pitch pin
        </a>
      </header>
      <main className="pin__main">
        <p className="pin__intro">Famous goals in packs. Pin where each was struck from; a bullseye is within two metres.</p>
        {shelves.map((s) => (
          <section key={s.title} className="pin__shelf">
            <h2 className="pin__shelfhead display">{s.title}</h2>
            <ul className="pin__packs">
              {s.packs.map((p) => (
                <li key={p.id}>
                  <a className="pin__pack" href={`/pin/${p.id}${query}`}>
                    <span className="pin__packtitle display">{p.title}</span>
                    <span className="pin__packsub">{p.subtitle}</span>
                    <span className="pin__packfoot">
                      {p.isNew ? <span className="pin__new display">New</span> : null}
                      <span className="pin__status">{store ? statusText(p, store, mode) : ' '}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="pin__credit">
          Shot data: Understat and StatsBomb open data. Shortlists: the Premier League. Past winners: Wikipedia.
        </p>
      </main>
    </div>
  );
}

function statusText(p: PackCard, store: Store, mode: Mode): string {
  const s = packStatus(store[p.id], p.size);
  if (s.state === 'unplayed') return 'Not played';
  if (s.state === 'part') return `${s.thrown} of ${p.size}`;
  const t = tally(s.distances);
  return mode === 'points' ? `${t.points} / ${p.size * 100}` : `${t.metres.toFixed(1)} m, ${againstPar(t.metres, p.par.metres)}`;
}
