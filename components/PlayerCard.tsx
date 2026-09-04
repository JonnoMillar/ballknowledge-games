'use client';
import { useDraggable } from '@dnd-kit/core';
import { isoForNation } from '../src/pipeline/nations';
import type { Player } from '../src/lib/chemistry/types';

export type CardVariant = 'given' | 'found' | 'library';

/**
 * Commons thumbnail. Special:FilePath redirects to a rendered thumbnail at the
 * requested width, so we never pull a full-size original. Files reached this
 * way are CC BY / CC BY-SA / public domain and need an attribution page before
 * this ships publicly.
 */
export function commonsThumb(filename: string, width: number): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

export default function PlayerCard({
  player, variant, slotId, nations, images, obscurity, outOfPosition = false, compact = false,
}: {
  player: Player;
  variant: CardVariant;
  /** Undefined when the card is sitting on the bench. */
  slotId?: string;
  nations: Record<string, string>;
  images: Record<string, string>;
  /**
   * 0–100 for this placement, or null while the player is still on the bench.
   * This is the number on the card — how obscure the pick was, not a rating.
   * Nothing in this game rates a player's ability.
   */
  obscurity: number | null;
  outOfPosition?: boolean;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${slotId ?? 'lib'}:${player.id}`,
    data: { playerId: player.id, fromSlot: slotId },
    disabled: variant === 'given',
  });

  const iso = isoForNation(player.nation, nations);
  const file = images[player.id];
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
        width: w, height: h, position: 'relative', flexShrink: 0, overflow: 'hidden',
        background: given
          ? 'linear-gradient(165deg, var(--given-a), var(--given-b))'
          : 'linear-gradient(165deg, var(--card-a), var(--card-b))',
        boxShadow: '0 8px 22px rgba(0,0,0,0.5)',
        opacity: isDragging ? 0.35 : 1,
        cursor: given ? 'default' : 'grab',
        touchAction: 'none',
      }}
    >
      {/* Photo. Crops vary wildly on Commons — action shots, crowds, portraits —
          so every one is forced through the same box: cover, anchored high,
          desaturated and dimmed so the card reads as a set rather than a
          scrapbook. */}
      {file ? (
        <img
          src={commonsThumb(file, 200)}
          alt=""
          style={{
            position: 'absolute', right: 0, top: 0, width: '78%', height: '72%',
            objectFit: 'cover', objectPosition: 'top center',
            filter: 'grayscale(0.35) contrast(1.05)',
            maskImage: 'linear-gradient(180deg, #000 58%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 58%, transparent 100%)',
            opacity: 0.92,
          }}
        />
      ) : (
        <svg style={{ position: 'absolute', right: 8, top: 20 }} width={compact ? 36 : 44} height={compact ? 36 : 44} viewBox="0 0 24 24" fill="none" stroke="var(--soft)" strokeWidth="1.4">
          <circle cx="12" cy="8" r="3.6" />
          <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
        </svg>
      )}

      {given && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: 'var(--green)' }} />}

      {obscurity !== null && (
        <div style={{ position: 'absolute', left: 7, top: 10 }}>
          <div className="cond" style={{ fontWeight: 700, fontSize: compact ? 18 : 21, lineHeight: 0.85, color: 'var(--gold)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            {obscurity}
          </div>
          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)' }}>OBSC</div>
        </div>
      )}

      {iso ? (
        <span className={`fi fi-${iso}`} style={{ position: 'absolute', left: 7, top: obscurity !== null ? 40 : 12, width: 18, height: 13, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.6)' }} />
      ) : (
        <span style={{ position: 'absolute', left: 7, top: obscurity !== null ? 40 : 12, width: 18, height: 13, borderRadius: 1, background: 'var(--slot-border)' }} />
      )}

      {outOfPosition && (
        <div style={{ position: 'absolute', right: 5, bottom: 34, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: '#e07a6a', background: 'rgba(10,14,22,0.85)', padding: '1px 4px', borderRadius: 2 }}>
          OUT OF POS
        </div>
      )}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, background: 'linear-gradient(180deg, transparent, rgba(9,13,22,0.92) 45%)' }} />

      <div className="cond" style={{ position: 'absolute', left: 3, right: 3, bottom: 19, textAlign: 'center', fontWeight: 700, fontSize: surname.length > 10 ? 11 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {surname}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, textAlign: 'center', fontSize: 8, fontWeight: 600, letterSpacing: '0.14em', color: given ? 'var(--green)' : 'var(--dim)' }}>
        {given ? 'GIVEN' : variant === 'found' ? 'PLACED' : 'BENCH'}
      </div>
    </div>
  );
}
