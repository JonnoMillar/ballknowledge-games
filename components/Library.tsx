'use client';
import { useDroppable } from '@dnd-kit/core';
import PlayerCard from './PlayerCard';
import type { GameState } from '../src/game/state';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * The bench. Unbounded and free — gathering candidates costs nothing.
 * Also a drop target, so a card dragged off the pitch comes back here.
 *
 * Fame is never shown on a bench card. The player has not been placed yet, and
 * revealing it would turn the bench into a solver.
 */
export default function Library({
  state, nations, images, onRemove,
}: {
  state: GameState;
  nations: Record<string, string>;
  images: Record<string, PortraitImage>;
  onRemove: (playerId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'library' });

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 226, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--line)',
        background: isOver ? 'rgba(94,224,138,0.06)' : 'transparent',
      }}
    >
      <div style={{ padding: '18px 16px 12px 16px', borderBottom: '1px solid var(--line)' }}>
        <div className="cond" style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.2em', color: 'var(--muted)' }}>
          BENCH · {state.library.length}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>
          Gather as many as you like. Costs nothing.
        </div>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto', padding: 16 }}>
        {state.library.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.5 }}>
            Search on the right to add players here, then drag them onto the pitch.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {state.library.map((id) => {
              const p = state.pool.get(id);
              if (!p) return null;
              return (
                <div key={id} style={{ position: 'relative' }}>
                  <PlayerCard player={p} variant="library" nations={nations} images={images} obscurity={null} compact />
                  <button
                    onClick={() => onRemove(id)}
                    aria-label={`Remove ${p.name} from bench`}
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                      borderRadius: '50%', border: '1px solid var(--border)',
                      background: 'var(--panel)', color: 'var(--soft)', cursor: 'pointer',
                      fontSize: 13, lineHeight: 1, padding: 0,
                    }}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
