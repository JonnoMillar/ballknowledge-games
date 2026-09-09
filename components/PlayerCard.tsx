'use client';
import { useDraggable } from '@dnd-kit/core';
import { isoForNation } from '../src/pipeline/nations';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

export type CardVariant = 'given' | 'found' | 'library';


export default function PlayerCard({
  player, variant, slotId, nations, images, obscurity,
  outOfPosition = false, compact = false, revealDelay, ring,
}: {
  player: Player;
  variant: CardVariant;
  /** Undefined when the card is sitting on the bench. */
  slotId?: string;
  nations: Record<string, string>;
  /** Player id to a ready picture. See src/lib/portraits.ts. */
  images: Record<string, PortraitImage>;
  /**
   * 0–100 for this placement, or null while the player is still on the bench.
   * This is the number on the card — how obscure the pick was, not a rating.
   * Nothing in this game rates a player's ability.
   */
  obscurity: number | null;
  outOfPosition?: boolean;
  compact?: boolean;
  /**
   * Milliseconds to wait before the obscurity chip rises in. Only chain mode
   * passes this — it withholds obscurity until the chain is locked in, so the
   * number arrives as a result rather than sitting there as a running total.
   */
  revealDelay?: number;
  /**
   * A CSS background for the photo's ring, which turns the card into a mounted
   * print instead of a dark slab. Passing it opts into the scouting-sheet
   * treatment; the XI board passes nothing and is untouched.
   *
   * On the chain board this is deliberately NEUTRAL until lock-in. The ring
   * shows the clubs that made a player fit, so colouring it while the board is
   * still open would answer the question the player is being asked.
   */
  ring?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${slotId ?? 'lib'}:${player.id}`,
    data: { playerId: player.id, fromSlot: slotId },
    disabled: variant === 'given',
  });

  const iso = isoForNation(player.nation, nations);
  const photo = images[player.id];
  const given = variant === 'given';
  const w = compact ? 92 : 108;
  const h = compact ? 120 : 140;
  const surname = plateName(player.id, player.name).toUpperCase();

  if (ring !== undefined) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="mount"
        title={player.name}
        style={{
          width: w, flexShrink: 0, position: 'relative',
          opacity: isDragging ? 0.35 : 1,
          cursor: given ? 'default' : 'grab',
          touchAction: 'none',
        }}
      >
        <div className="photo" style={{ width: w - 10, height: h - 22, background: ring }}>
          {photo ? (
            <img
              src={photo.url}
              alt=""
              style={{
                objectFit: photo.fit,
                objectPosition: photo.fit === 'cover' ? '50% 18%' : '50% 50%',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#e6ded0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,16,0.3)" strokeWidth="1.4">
                <circle cx="12" cy="8" r="3.6" />
                <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
              </svg>
            </div>
          )}
          {iso ? (
            <span className={`fi fi-${iso}`} style={{ position: 'absolute', left: 8, bottom: 8, width: 18, height: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.55)' }} />
          ) : null}
        </div>

        <div style={{ width: w - 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4, padding: '5px 1px 7px' }}>
          <span
            className="narrow"
            style={{
              fontWeight: 700, fontSize: surname.length > 11 ? 10 : 12, letterSpacing: '0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: given ? 'var(--ink)' : 'var(--accent)',
            }}
          >
            {surname}
          </span>
          {obscurity !== null && (
            <span
              className="slab"
              style={{
                fontSize: 15, lineHeight: 1, color: 'var(--gold)', flexShrink: 0,
                animation: revealDelay === undefined
                  ? undefined
                  : `chip-in 380ms cubic-bezier(0.16,0.84,0.3,1) ${revealDelay}ms both`,
              }}
            >
              {obscurity}
            </span>
          )}
        </div>
      </div>
    );
  }

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
      {photo ? (
        <img
          src={photo.url}
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
        <div
          style={{
            position: 'absolute', left: 7, top: 10,
            animation: revealDelay === undefined
              ? undefined
              : `chip-in 380ms cubic-bezier(0.16,0.84,0.3,1) ${revealDelay}ms both`,
          }}
        >
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
