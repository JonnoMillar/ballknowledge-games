'use client';
import { useState } from 'react';
import Slab from './Slab';
import { solid } from './Sticker';
import { GRADES, GRADE_WORD } from '../src/lib/chain/grade';
import type { Named } from '../src/lib/chain/client';
import type { PortraitImage } from '../src/lib/portraits';

export interface GroundCard { player: Named; image: PortraitImage; colour: string }

const GROUNDS = [
  ['house', 'House paper'],
  ['grade', 'Grade material'],
  ['stadium', 'Stadium'],
  ['club', 'Club colour (now)'],
] as const;
type Ground = (typeof GROUNDS)[number][0];

/**
 * Dev only (/grounds): the same cards on each candidate ground, one at a
 * time so the page fits a laptop. Grades cycle Basic to Elite so every
 * material shows. Kit cards (no good photo) keep their club ground on all.
 */
export default function GroundsPreview({ cards }: { cards: GroundCard[] }) {
  const [ground, setGround] = useState<Ground>('house');
  return (
    <main className="gprev">
      <div className="gprev__bar" role="group" aria-label="Ground">
        <span className="hero__eyebrow">Card ground</span>
        {GROUNDS.map(([id, label]) => (
          <button key={id} type="button" className={`gprev__btn ${ground === id ? 'is-on' : ''}`} aria-pressed={ground === id} onClick={() => setGround(id)}>
            {label}
          </button>
        ))}
      </div>
      <ul className={`gprev__grid grounds--${ground}`}>
        {cards.map((c, i) => {
          const grade = GRADES[i % GRADES.length]!;
          return (
            <li key={c.player.id} title={GRADE_WORD[grade]}>
              <Slab grade={grade} player={c.player} image={c.image} ground={solid(c.colour)} size="sm" />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
