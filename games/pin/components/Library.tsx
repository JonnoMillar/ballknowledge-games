'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import Demo from './Demo';
import PackCard, { pairsOf, Stamp } from './PackCard';
import { Ball, Lines, PinMark } from './Pitch';
import { PinLogo } from './PitchPin';
import Scale from './Scale';
import { readStore, record, suggest, type Store } from '../lib/progress';
import { points } from '../lib/score';
import type { PackCard as Card, Shelf } from '../lib/types';
import Back from '../../../components/Back';
import Words from '../../../components/Words';
import { GAMES } from '../../../src/games';

/** Pitch pin's ground: the same blue as its tile on the hub. */
const GROUND = GAMES.find((g) => g.id === 'pin')!.ground;

/**
 * The way in, laid out like every game's front page: the hero on Pitch
 * pin's lit ground with the hub's miniature, paper cards beneath.
 *
 * - The hero: the question on the left; on the right the pack to play
 *   (Start here on a first visit, Carry on with a pack in progress,
 *   otherwise Up next) and the page's one red button.
 * - Your record, once a pack is finished.
 * - How it works: the demo (first visit only), the steps, the scale. Up top
 *   on a first visit, beside the record after.
 * - The shelves, one wide card each, then the credit.
 *
 * The shelves come from the server; the pack, the record and every card's
 * status come from this browser's saves, read after mount since
 * localStorage is not on the server. The hero is there from the first
 * frame, so it can grow out of the hub's tile.
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
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/pin">
          <PinLogo />
          Pitch pin
        </a>
      </header>
      <main className="lobby">
        <section className="lobby-hero lobby__wide" style={{ '--ground': GROUND } as CSSProperties}>
          <span className="lobby-hero__ground" style={{ viewTransitionName: 'game-pin' }} aria-hidden />
          <img className="lobby-hero__mini" src="/hub/pin.webp" alt="" width={480} height={480} style={{ viewTransitionName: 'game-pin-mini' }} />
          <div className="lobby-hero__ask">
            <span className="lobby-tag">Packs</span>
            <h1 className="lobby-hero__head display"><Words text="Where was it struck from?" /></h1>
            <p className="lobby-hero__sub">Famous goals, one pin each.</p>
          </div>
          <div className="lobby-hero__go pin-lobby__go">
            {store === null ? null : pick?.state === 'part' && picked ? (
              <Carry card={picked} store={saves} />
            ) : picked ? (
              <>
                <PackLine card={picked} eyebrow={fresh ? 'Start here' : 'Up next'} sub={fresh ? `${picked.size} goals` : picked.subtitle} />
                <a className="lobby-play display" href={`/pin/${picked.id}`}>Play</a>
              </>
            ) : (
              <div className="pin-lobby__pack">
                <span className="pin-lobby__packtext">
                  <span className="pin-lobby__packtitle display">Every pack played</span>
                  <span className="pin-lobby__packsub">New ones land each week.</span>
                </span>
              </div>
            )}
          </div>
        </section>

        {fresh ? <How demo /> : null}

        {rec.packs ? (
          <section className="lobby-card pin-lobby__record">
            <span className="lobby-tag lobby-tag--paper">Your record</span>
            <div className="pin__record">
              <span><span>Packs</span><b className="display">{rec.packs}</b></span>
              <span><span>Average</span><b className="display">{rec.average}</b></span>
              <span><span>Best</span><b className="display">{rec.best} <Stamp score={rec.best!} small /></b></span>
            </div>
          </section>
        ) : null}

        {store && !fresh ? <How /> : null}

        {shelves.map((s) => (
          <section key={s.title} className="lobby-card lobby__wide">
            <span className="lobby-tag lobby-tag--paper">{s.title}</span>
            <ul className="pin__shelf">
              {s.packs.map((p) => (
                <li key={p.id}><PackCard card={p} play={saves[p.id]} loaded={store !== null} /></li>
              ))}
            </ul>
          </section>
        ))}

        <p className="pin__credit lobby__wide">
          <img src="/credits/statsbomb.png" alt="StatsBomb" height={16} />
          Shot data: Understat and StatsBomb open data. Shortlists: the Premier League. Past winners: Wikipedia.
        </p>
      </main>
    </div>
  );
}

/** How it works. With the demo on a first visit, across the page; without, beside the record. */
function How({ demo }: { demo?: boolean }) {
  return (
    <section className={`lobby-card pin-lobby__how${demo ? ' lobby__wide pin-lobby__how--demo' : ''}`} id="how">
      <span className="lobby-tag lobby-tag--paper">How it works</span>
      {demo ? <Demo /> : null}
      <div className="pin-lobby__howbody">
        <ol className="pin__steps">
          <li><span className="display">1</span>A famous goal is named.</li>
          <li><span className="display">2</span>Pin where it was struck from.</li>
          <li><span className="display">3</span>Up to 100 a goal. Inside 2 m is a bullseye.</li>
        </ol>
        <Scale />
        <p className="pin__packsub">Each pack lands on the scale, out of 100. Pinpoint is 90 and up.</p>
      </div>
    </section>
  );
}

/** A pack in the hero: its colour and the top of the pitch, with this browser's pins on it. */
function PackLine({ card, eyebrow, sub, store }: { card: Card; eyebrow: string; sub: string; store?: Store }) {
  return (
    <a className="pin-lobby__pack" href={`/pin/${card.id}`}>
      <span className={`pin__swatch pin__art pin__art--${card.kind}`} aria-hidden>
        <svg viewBox="8 -3 52 26">
          <Lines />
          {pairsOf(store?.[card.id]).map((p, i) => (
            <g key={i}><Ball at={p.at} still /><PinMark at={p.pin} /></g>
          ))}
        </svg>
      </span>
      <span className="pin-lobby__packtext">
        <span className="pin__eyebrow">{eyebrow}</span>
        <span className="pin-lobby__packtitle display">{card.title}</span>
        <span className="pin-lobby__packsub">
          {card.isNew ? <span className="pin__new display">New</span> : null} {sub}
        </span>
      </span>
    </a>
  );
}

function Carry({ card, store }: { card: Card; store: Store }) {
  const play = store[card.id];
  const thrown = pairsOf(play).length;
  const sofar = (play?.throws ?? []).reduce((a, t) => a + (t ? points(t.answer.distance) : 0), 0);
  return (
    <>
      <PackLine card={card} eyebrow="Carry on" sub={`${thrown} of ${card.size} thrown · ${sofar} pts`} store={store} />
      <ol className="pin-lobby__ticks" aria-hidden>
        {(play?.throws ?? []).map((t, i) => <li key={i} className={t ? 'is-done' : ''} />)}
      </ol>
      <a className="lobby-play display" href={`/pin/${card.id}`}>Continue</a>
    </>
  );
}
