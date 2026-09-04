'use client';
import { useDraggable } from '@dnd-kit/core';
import { isoForNation } from '../src/pipeline/nations';
import type { Player } from '../src/lib/chemistry/types';

export type CardVariant = 'given' | 'found' | 'library';

export default function PlayerCard({
  player, variant, slotId, nations, revealFame, compact = false,
}: {
  player: Player;
  variant: CardVariant;
  /** Undefined when the card is sitting on the bench. */
  slotId?: string;
  nations: Record<string, string>;
  /** Fame is hidden until a player is placed. Never true on the bench. */
  revealFame: boolean;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${slotId ?? 'lib'}:${player.id}`,
    data: { playerId: player.id, fromSlot: slotId },
    disabled: variant === 'given',
  });

  const iso = isoForNation(player.nation, nations);
  const given = variant === 'given';
  const w = compact ? 92 : 108;
  const h = compact ? 120 : 140;
  const surname = player.name.split(' ').slice(-1)[0]!.toUpperCase();

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="card-shape"
      title={player.name}
      style={{
        width: w, height: h, position: 'relative', flexShrink: 0,
        background: given
          ? 'linear-gradient(165deg, var(--given-a), var(--given-b))'
          : 'linear-gradient(165deg, var(--card-a), var(--card-b))',
        boxShadow: '0 8px 22px rgba(0,0,0,0.5)',
        opacity: isDragging ? 0.35 : 1,
        cursor: given ? 'default' : 'grab',
        touchAction: 'none',
      }}
    >
      {given && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: 'var(--green)' }} />}

      {revealFame && (
        <div className="cond" style={{ position: 'absolute', left: 8, top: 11, fontWeight: 700, fontSize: compact ? 17 : 20, lineHeight: 0.9, color: given ? 'var(--text)' : 'var(--gold)' }}>
          {player.fame.value}
        </div>
      )}

      {iso ? (
        <span className={`fi fi-${iso}`} style={{ position: 'absolute', left: 8, top: compact ? 32 : 36, width: 18, height: 13, borderRadius: 1 }} />
      ) : (
        <span style={{ position: 'absolute', left: 8, top: compact ? 32 : 36, width: 18, height: 13, borderRadius: 1, background: 'var(--slot-border)' }} />
      )}

      <svg style={{ position: 'absolute', right: 7, top: 20 }} width={compact ? 36 : 44} height={compact ? 36 : 44} viewBox="0 0 24 24" fill="none" stroke="var(--soft)" strokeWidth="1.4">
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
      </svg>

      <div className="cond" style={{ position: 'absolute', left: 3, right: 3, bottom: 20, textAlign: 'center', fontWeight: 700, fontSize: surname.length > 10 ? 11 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {surname}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, textAlign: 'center', fontSize: 8, fontWeight: 600, letterSpacing: '0.14em', color: given ? 'var(--green)' : 'var(--dim)' }}>
        {given ? 'GIVEN' : variant === 'found' ? 'PLACED' : 'BENCH'}
      </div>
    </div>
  );
}
