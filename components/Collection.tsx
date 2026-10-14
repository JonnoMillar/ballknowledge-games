'use client';
import { useEffect, useRef, useState } from 'react';
import { Mark } from './Chain';
import MastNav from './MastNav';
import Slab, { GradeChip } from './Slab';
import type { Ground } from './Sticker';
import { clubColour } from '../src/lib/club-colours';
import { GRADES, GRADE_LINE, GRADE_WORD, type Grade } from '../src/lib/chain/grade';
import { readCollection, sortedCards, type Card } from '../src/lib/collection';
import { longDate } from '../src/lib/daily';
import Back from './Back';

/**
 * The collection: every card won on a Deep Cuts board, grouped by grade,
 * rarest first. A chip narrows it to one grade; a card opens to where it
 * was found. Everything is read from localStorage on mount.
 */
export default function Collection() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [filter, setFilter] = useState<Grade | 'all'>('all');
  const [open, setOpen] = useState<Card | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { setCards(sortedCards(readCollection())); }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  const rarestFirst = [...GRADES].reverse();
  const count = (g: Grade) => cards?.filter((c) => c.grade === g).length ?? 0;
  const sections = rarestFirst
    .filter((g) => filter === 'all' || filter === g)
    .map((g) => ({ grade: g, cards: cards?.filter((c) => c.grade === g) ?? [] }))
    .filter((s) => s.cards.length > 0);

  return (
    <div className="app">
      <header className="masthead">
        <Back href="/deep" label="Deep Cuts" />
        <a className="masthead__brand display" href="/chain">
          <Mark className="masthead__mark" />
          Chain
        </a>
        <div className="masthead__meta">
          <MastNav current="collection" />
        </div>
      </header>

      <main className="home collection">
        <section className="collection__top">
          <div>
            <p className="hero__eyebrow">Your collection</p>
            <h1 className="hero__head display">
              {cards === null ? 'Cards' : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
            </h1>
          </div>
          <p className="collection__blurb">
            Every Deep Cuts pick that held, at the best grade you have found it at. Tap a card to see where it came from.
          </p>
        </section>

        {cards !== null && cards.length === 0 ? (
          <section className="page collection__empty">
            <GradeChip grade="grail" />
            <p><b>No cards yet.</b> Seal a Deep Cuts board and every pick that holds comes back in a case. The deeper the pick, the rarer the case.</p>
            <a className="seal seal--link" href="/deep">Play Deep Cuts</a>
          </section>
        ) : null}

        {cards && cards.length > 0 ? (
          <>
            <div className="collection__chips" role="group" aria-label="Show one grade">
              <button type="button" className={`chip ${filter === 'all' ? 'is-on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                All <b>{cards.length}</b>
              </button>
              {rarestFirst.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip ${filter === g ? 'is-on' : ''}`}
                  aria-pressed={filter === g}
                  disabled={count(g) === 0}
                  onClick={() => setFilter(g)}
                >
                  {GRADE_WORD[g]} <b>{count(g)}</b>
                </button>
              ))}
            </div>

            {sections.map(({ grade, cards: mine }) => (
              <section key={grade} className="collection__section">
                <header className="collection__head">
                  <GradeChip grade={grade} />
                  <span className="collection__count">{mine.length} {mine.length === 1 ? 'card' : 'cards'}</span>
                  <span className="collection__line">{GRADE_LINE[grade]}</span>
                </header>
                <ul className="collection__grid">
                  {mine.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="collection__card" onClick={() => setOpen(c)} aria-label={`${c.name}, ${GRADE_WORD[c.grade]}`}>
                        <Slab grade={c.grade} player={c} image={c.image} ground={groundOf(c)} size="sm" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        ) : null}
      </main>

      <dialog
        ref={dialog}
        className="key card-detail"
        aria-label={open ? open.name : 'Card'}
        onClose={() => setOpen(null)}
        onClick={(e) => { if (e.target === dialog.current) setOpen(null); }}
      >
        {open ? (
          <div className="key__sheet card-detail__sheet">
            <button type="button" className="key__close" aria-label="Close" onClick={() => setOpen(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <Slab grade={open.grade} player={open} image={open.image} ground={groundOf(open)} size="lg" />
            <div className="card-detail__copy">
              <h2 className="key__head display">{open.name}</h2>
              <p>Found on <a href={`/play/${open.board}`}>Deep Cuts {open.board}</a>, {longDate(open.date)}.</p>
              {open.via.length > 0 ? <p>Linked through {joinAnd(open.via)}.</p> : null}
              <p className="card-detail__grade">{GRADE_LINE[open.grade]}</p>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

const groundOf = (c: Card): Ground => {
  const [a, b] = c.clubs ?? [];
  const ca = a ? clubColour(a) : 'var(--ground-neutral)';
  return { a: ca, b: b ? clubColour(b) : ca, liveA: true, liveB: true };
};

function joinAnd(xs: readonly string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}
