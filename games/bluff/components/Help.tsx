'use client';
import { GROUPS, type Group } from '../lib/match';
import type { Named } from '../lib/types';
import { Name } from './Pitch';
import type { useCardDrag } from './useCardDrag';

const LABEL: Record<Group, string> = { GK: 'Keeper', DEF: 'Defence', MID: 'Midfield', FWD: 'Attack' };

/**
 * "Help the faker": the round's suggested fakes as the same white cards as
 * the pitch. Tap a player on the pitch and their group's cards are here; with
 * nobody picked, all of them are. Tap a card, or drag it onto the pitch.
 */
export default function Help({
  set, group, chosen, onChoose, grab,
}: {
  set: Record<Group, Named[]>;
  group: Group | null;
  chosen: Named | null;
  onChoose: (p: Named) => void;
  grab: ReturnType<typeof useCardDrag>['grab'];
}) {
  const shown = (group ? [group] : GROUPS).filter((g) => set[g].length > 0);
  if (shown.length === 0) return null;
  return (
    <section className="bf-help vt" aria-label="Suggested fakes">
      <h2 className="bf-eyebrow bf-eyebrow--light">Suggested · drag one onto the pitch</h2>
      <div className="bf-help__groups" key={group ?? 'all'}>
        {shown.map((g) => (
          <div key={g} className="bf-help__group">
            <span className="bf-help__label">{LABEL[g]}</span>
            <div className="bf-help__cards">
              {set[g].map((p) => {
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
          </div>
        ))}
      </div>
    </section>
  );
}
