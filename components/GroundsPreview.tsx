'use client';
import { useState, type CSSProperties } from 'react';
import Slab from './Slab';
import { StickerFace, neutral, solid } from './Sticker';
import { GRADES, GRADE_WORD } from '../src/lib/chain/grade';
import type { Named } from '../src/lib/chain/client';
import type { PortraitImage } from '../src/lib/portraits';

export interface GroundCard { player: Named; image: PortraitImage; colour: string }
export interface KitOption { id: string; label: string; url: string }

const VIEWS = [['cards', 'Cutouts'], ['kit', 'Kit card figures']] as const;
type View = (typeof VIEWS)[number][0];

/**
 * Dev only (/grounds): how a card looks on the site-wide grade material.
 *
 * Cutouts: the same cards cycling Basic to Elite, or before the reveal (the
 * bare sticker on grey, as it sits in the Steps gap until the verdict).
 * Kit card figures: each candidate figure for a player with no photo, on grey
 * (with and without the crest) and on the five grades' materials. The figure
 * is a CSS mask (`--kit-url`), so a candidate is a file in public/kit.
 */
export default function GroundsPreview({ cards, kit }: { cards: GroundCard[]; kit: { options: KitOption[]; card: GroundCard } }) {
  const [view, setView] = useState<View>('kit');
  const [before, setBefore] = useState(false);
  return (
    <main className="gprev">
      <div className="gprev__bar" role="group" aria-label="View">
        <span className="hero__eyebrow">Show</span>
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" className={`gprev__btn ${view === id ? 'is-on' : ''}`} aria-pressed={view === id} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
        {view === 'cards' ? (
          <>
            <span className="hero__eyebrow gprev__gap">Reveal</span>
            {([[true, 'Before'], [false, 'After']] as const).map(([b, label]) => (
              <button key={label} type="button" className={`gprev__btn ${before === b ? 'is-on' : ''}`} aria-pressed={before === b} onClick={() => setBefore(b)}>
                {label}
              </button>
            ))}
          </>
        ) : null}
      </div>
      {view === 'cards' ? (
        <ul className="gprev__grid">
          {cards.map((c, i) => {
            const grade = GRADES[i % GRADES.length]!;
            return (
              <li key={c.player.id} title={GRADE_WORD[grade]}>
                {before
                  ? <StickerFace player={c.player} image={c.image} ground={neutral()} className="sticker--still" />
                  : <Slab grade={grade} player={c.player} image={c.image} ground={solid(c.colour)} size="sm" />}
              </li>
            );
          })}
        </ul>
      ) : (
        kit.options.map((o) => (
          <section key={o.id} className="gprev__opt">
            <h2>{o.label}</h2>
            <ul className="gprev__row" style={{ '--kit-url': `url(${o.url})` } as CSSProperties}>
              <li title="Before the verdict: grey, no crest"><StickerFace player={kit.card.player} image={kit.card.image} ground={neutral()} className="sticker--still" /></li>
              <li title="Grey, crest shown (a card with no grade yet)"><StickerFace player={kit.card.player} image={kit.card.image} ground={solid(kit.card.colour)} className="sticker--still" /></li>
              {GRADES.map((g) => (
                <li key={g} title={GRADE_WORD[g]}><Slab grade={g} player={kit.card.player} image={kit.card.image} ground={solid(kit.card.colour)} size="sm" /></li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
