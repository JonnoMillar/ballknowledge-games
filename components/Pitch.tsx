'use client';
import { useDroppable } from '@dnd-kit/core';
import PlayerCard from './PlayerCard';
import { linkViews } from '../src/game/derive';
import type { GameState } from '../src/game/state';
import type { PortraitImage } from '../src/lib/portraits';

// Geometry lifted from design/Main.dc.html. Card centres, and the pill anchors
// the links are drawn between (pill sits 76px below the card centre).
const POS: Record<string, { x: number; y: number }> = {
  ST: { x: 440, y: 77 }, LW: { x: 150, y: 112 }, RW: { x: 730, y: 112 },
  LCM: { x: 238, y: 308 }, CM: { x: 440, y: 343 }, RCM: { x: 642, y: 308 },
  LB: { x: 114, y: 476 }, LCB: { x: 317, y: 504 }, RCB: { x: 563, y: 504 },
  RB: { x: 766, y: 476 }, GK: { x: 440, y: 616 },
};
const anchor = (id: string) => ({ x: POS[id]!.x, y: POS[id]!.y + 76 });

const STROKE: Record<string, string> = {
  green: 'var(--green)', hyper: 'var(--gold-light)',
  orange: 'var(--gold)', red: '#c0392b', any: 'var(--slot-border)',
};

function Slot({
  state, slotId, images, obscurityFor, chem, focused, onFocus,
}: {
  state: GameState; slotId: string;
  images: Record<string, PortraitImage>;
  obscurityFor: (slotId: string) => number | null;
  /** Individual chemistry 0..10 for this slot, or null when empty. */
  chem: number | null;
  focused: boolean; onFocus: (s: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const playerId = state.placed[slotId];
  const player = playerId ? state.pool.get(playerId) : undefined;
  const given = state.board.seeded[slotId] !== undefined;
  const rejected = state.lastRejection?.slotId === slotId;
  const p = POS[slotId]!;

  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)', width: 108 }}>
      <div ref={setNodeRef} onClick={() => !given && onFocus(slotId)}>
        {player ? (
          <PlayerCard
            player={player}
            variant={given ? 'given' : 'found'}
            slotId={slotId}
            images={images}
            obscurity={given ? null : obscurityFor(slotId)}
            outOfPosition={!player.positions.includes(
              state.formation.slots.find((sl) => sl.id === slotId)!.position,
            )}
          />
        ) : (
          <div
            className="card-shape"
            style={{
              width: 108, height: 140, cursor: 'pointer',
              border: `2px dashed ${focused ? 'var(--green)' : rejected ? '#c0392b' : 'var(--slot-border)'}`,
              background: isOver ? 'rgba(94,224,138,0.14)' : 'rgba(11,16,28,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: focused ? '0 0 0 5px rgba(94,224,138,0.14)' : 'none',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={focused ? 'var(--green)' : '#33455f'} strokeWidth="1.6">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
            </svg>
          </div>
        )}
      </div>
      <div
        className="cond"
        style={{
          position: 'absolute', left: '50%', top: 148, transform: 'translateX(-50%)',
          width: 58, height: 22, borderRadius: 11, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontWeight: 700,
          fontSize: 12, letterSpacing: '0.08em',
          background: focused ? 'var(--green)' : player ? 'var(--green-pill)' : 'var(--panel-2)',
          color: focused ? 'var(--bg)' : player ? '#d8ffe6' : '#5b6f92',
          border: player || focused ? 'none' : '1px solid var(--slot-border)',
        }}
      >
        {slotId}
      </div>

      {/* Individual chemistry, 0..10. Deliberately quiet — it sits beside the
          position pill rather than on the card, so it reads as a property of
          the slot without competing with the player's name. */}
      {chem !== null && (
        <div
          className="cond"
          title={`Individual chemistry ${chem}/10`}
          style={{
            position: 'absolute', left: 'calc(50% + 34px)', top: 148,
            height: 22, minWidth: 22, padding: '0 5px', borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 12,
            background: chem >= 10 ? 'rgba(94,224,138,0.16)' : 'rgba(22,34,58,0.9)',
            color: chem >= 10 ? 'var(--green)' : chem >= 6 ? 'var(--soft)' : '#8a6a55',
            border: `1px solid ${chem >= 10 ? 'rgba(94,224,138,0.45)' : 'var(--slot-border)'}`,
          }}
        >
          {chem}
        </div>
      )}
    </div>
  );
}

export default function Pitch({
  state, images, obscurityFor, perSlotChem, focusedSlot, onFocus,
}: {
  state: GameState;
  images: Record<string, PortraitImage>;
  obscurityFor: (slotId: string) => number | null;
  perSlotChem: Record<string, number>;
  focusedSlot: string | null; onFocus: (s: string) => void;
}) {
  const links = linkViews(state);

  return (
    <div style={{ position: 'relative', width: 880, height: 700 }}>
      <svg viewBox="0 0 880 700" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.13 }}>
        <rect x="58" y="8" width="764" height="684" fill="none" stroke="#8fb0d8" strokeWidth="1.5" />
        <circle cx="440" cy="350" r="94" fill="none" stroke="#8fb0d8" strokeWidth="1.5" />
        <line x1="58" y1="350" x2="822" y2="350" stroke="#8fb0d8" strokeWidth="1.5" />
        <rect x="268" y="560" width="344" height="132" fill="none" stroke="#8fb0d8" strokeWidth="1.5" />
        <rect x="268" y="8" width="344" height="132" fill="none" stroke="#8fb0d8" strokeWidth="1.5" />
      </svg>

      <div className="cond" style={{ position: 'absolute', left: 6, bottom: 20, fontWeight: 700, fontSize: 64, color: 'rgba(143,176,216,0.12)' }}>
        4-3-3
      </div>

      <svg viewBox="0 0 880 700" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <filter id="lg" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {links.map((l) => {
          const a = anchor(l.a);
          const b = anchor(l.b);
          // Open: the adjacency exists but nothing has been earned yet. Drawn
          // faintly so the shape of the web is legible without implying that
          // any particular colour is required there.
          if (l.status === 'open' || !l.colour) {
            return <line key={l.key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--line)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />;
          }
          return (
            <line key={l.key} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={STROKE[l.colour]}
              strokeWidth={l.colour === 'red' ? 3 : 4.5}
              strokeLinecap="round"
              filter={l.colour === 'red' ? undefined : 'url(#lg)'} />
          );
        })}
      </svg>

      {Object.keys(POS).map((slotId) => (
        <Slot key={slotId} state={state} slotId={slotId}
          images={images} obscurityFor={obscurityFor}
          chem={state.placed[slotId] ? (perSlotChem[slotId] ?? 0) : null}
          focused={focusedSlot === slotId} onFocus={onFocus} />
      ))}
    </div>
  );
}
