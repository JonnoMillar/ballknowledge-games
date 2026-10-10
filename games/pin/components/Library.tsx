'use client';
import { useEffect, useState } from 'react';
import Demo from './Demo';
import PackCard, { KindArt, pairsOf, Stamp } from './PackCard';
import { Lines } from './Pitch';
import { PinLogo } from './PitchPin';
import Scale from './Scale';
import { readStore, record, suggest, type Store } from '../lib/progress';
import { points } from '../lib/score';
import type { PackCard as Card, Shelf } from '../lib/types';

/**
 * The hub. The shelves come from the server; the top card, the record and
 * every card's status come from this browser's saves, read after mount
 * since localStorage is not on the server. A browser that has thrown at no
 * pack gets the demo and How it works up top.
 */
export default function Library({ shelves }: { shelves: Shelf[] }) {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => setStore(readStore()), []);

  const cards = shelves.flatMap((s) => s.packs);
  const order = cards.map((c) => ({ id: c.id, size: c.size }));
  const saves = store ?? {};
  const pick = store ? suggest(order, store) : null;
  const picked = pick ? cards.find((c) => c.id === pick.id)! : null;
  const rec = record(saves, order);
  const fresh = store !== null && rec.packs === 0 && pick?.state !== 'part';

  return (
    <div className="app pin">
      <header className="masthead">
        <a className="masthead__brand display" href="/pin">
          <PinLogo />
          Pitch pin
        </a>
        {store && !fresh ? <a className="pin__howlink" href="#how">How it works</a> : null}
      </header>
      <main className="pin__main pin__main--hub">
        {store === null ? (
          <section className="pin__top pin__top--wait" aria-hidden />
        ) : fresh ? (
          <section className="pin__top pin__hero">
            <div className="pin__herotext">
              <span className="pin__eyebrow">Famous goals, one pin each</span>
              <h1 className="pin__headline display">Where was it struck from?</h1>
              {picked ? <StartHere card={picked} /> : null}
            </div>
            <Demo />
          </section>
        ) : pick?.state === 'part' && picked ? (
          <Carry card={picked} store={saves} />
        ) : picked ? (
          <section className="pin__top pin__upnext">
            <KindArt kind={picked.kind} tall />
            <div className="pin__nextbody">
              <span className="pin__eyebrow">Up next</span>
              <h1 className="pin__nexttitle display">{picked.title}</h1>
              <span className="pin__packsub">
                {picked.isNew ? <span className="pin__new display">New</span> : null} {picked.subtitle}
              </span>
              <a className="pin__play display" href={`/pin/${picked.id}`}>Play</a>
            </div>
          </section>
        ) : (
          <section className="pin__top pin__done">
            <h1 className="pin__nexttitle display">Every pack played</h1>
            <p className="pin__packsub">New ones land each week.</p>
          </section>
        )}

        {rec.packs ? (
          <section className="pin__section">
            <h2 className="pin__shelfhead display">Your record</h2>
            <div className="pin__record">
              <span><span>Packs</span><b className="display">{rec.packs}</b></span>
              <span><span>Average</span><b className="display">{rec.average}</b></span>
              <span><span>Best</span><b className="display">{rec.best} <Stamp score={rec.best!} small /></b></span>
            </div>
          </section>
        ) : null}

        {fresh ? <How /> : null}

        {shelves.map((s) => (
          <section key={s.title} className="pin__section">
            <h2 className="pin__shelfhead display">{s.title}</h2>
            <ul className="pin__shelf">
              {s.packs.map((p) => (
                <li key={p.id}><PackCard card={p} play={saves[p.id]} loaded={store !== null} /></li>
              ))}
            </ul>
          </section>
        ))}

        {store && !fresh ? <How /> : null}

        <p className="pin__credit">
          <img src="/credits/statsbomb.png" alt="StatsBomb" height={16} />
          Shot data: Understat and StatsBomb open data. Shortlists: the Premier League. Past winners: Wikipedia.
        </p>
      </main>
    </div>
  );
}

function Steps() {
  return (
    <ol className="pin__steps">
      <li><span className="display">1</span>A famous goal is named.</li>
      <li><span className="display">2</span>Pin where it was struck from.</li>
      <li><span className="display">3</span>Up to 100 a goal. Inside 2 m is a bullseye.</li>
    </ol>
  );
}

function How() {
  return (
    <section className="pin__section" id="how">
      <h2 className="pin__shelfhead display">How it works</h2>
      <Steps />
      <Scale />
      <p className="pin__packsub">Each pack lands on the scale, out of 100. Pinpoint is 90 and up.</p>
    </section>
  );
}

function StartHere({ card }: { card: Card }) {
  return (
    <div className="pin__start">
      <a className="pin__startpack" href={`/pin/${card.id}`}>
        <span className={`pin__swatch pin__art pin__art--${card.kind}`} aria-hidden>
          <svg viewBox="8 -3 52 26"><Lines /></svg>
        </span>
        <span className="pin__starttext">
          <span className="pin__eyebrow">Start here</span>
          <span className="pin__starttitle display">{card.title}</span>
          <span className="pin__packsub">
            {card.isNew ? <span className="pin__new display">New</span> : null} {card.size} goals
          </span>
        </span>
      </a>
      <a className="pin__play display" href={`/pin/${card.id}`}>Play</a>
    </div>
  );
}

function Carry({ card, store }: { card: Card; store: Store }) {
  const play = store[card.id];
  const thrown = pairsOf(play).length;
  const sofar = (play?.throws ?? []).reduce((a, t) => a + (t ? points(t.answer.distance) : 0), 0);
  return (
    <section className="pin__top pin__upnext">
      <KindArt kind={card.kind} play={play} tall />
      <div className="pin__nextbody">
        <span className="pin__eyebrow">Carry on</span>
        <div className="pin__carryhead">
          <h1 className="pin__nexttitle display">{card.title}</h1>
          <span className="pin__carrypts display">{sofar}<small> pts</small></span>
        </div>
        <div className="pin__ticks">
          <span>{thrown} of {card.size} thrown</span>
          <ol aria-hidden>
            {(play?.throws ?? []).map((t, i) => <li key={i} className={`pin__tick${t ? ' pin__tick--done' : ''}`} />)}
          </ol>
        </div>
        <a className="pin__play display" href={`/pin/${card.id}`}>Continue</a>
      </div>
    </section>
  );
}
