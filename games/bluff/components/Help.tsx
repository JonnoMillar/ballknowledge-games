'use client';
import type { Group } from '../lib/match';
import type { Named } from '../lib/types';
import { Name } from './Pitch';
import type { useCardDrag } from './useCardDrag';

const LABEL: Record<Group, string> = { GK: 'Keeper', DEF: 'Defence', MID: 'Midfield', FWD: 'Attack' };

/**
 * "Help the faker": the suggested fakes for the position just tapped, as the
 * same white cards as the pitch. Nothing shows until a position is picked.
 * Tap a card, or drag it onto the pitch.
 */
export default function Help({
  cards, group, chosen, onChoose, grab,
}: {
  cards: Named[];
  group: Group;
  chosen: Named | null;
  onChoose: (p: Named) => void;
  grab: ReturnType<typeof useCardDrag>['grab'];
}) {
  if (cards.length === 0) return null;
  return (
    <section className="bf-help vt" aria-label="Suggested fakes">
      <h2 className="bf-eyebrow bf-eyebrow--light">{LABEL[group]} suggestions · tap or drag</h2>
      <div className="bf-help__cards" key={group}>
        {cards.map((p) => {
          const drag = grab(p);
          return (
            <button
              key={p.id}
              type="button"
              className={`bf-slot bf-slot--help${chosen?.id === p.id ? ' is-swapped' : ''}`}
              onPointerDown={drag.onPointerDown}
              onClick={() => { if (!drag.wasDrag()) onChoose(p); }}
            >
              <Name name={p.name} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
