'use client';
import { useDraggable } from '@dnd-kit/core';
import Pin from './Pin';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

export type CardVariant = 'given' | 'found' | 'library';

/** The plate a photo sits on when there is no photo. */
export function EmptyPlate({ size = 30 }: { size?: number }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#e6ded0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,16,0.3)" strokeWidth="1.4">
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
      </svg>
    </div>
  );
}

export default function PlayerCard({
  player, variant, slotId, images, obscurity,
  outOfPosition = false, compact = false, revealDelay, ring,
  tilt = 0, pin = null, pinDriving = false, pinDelay = 0, landing = false,
  index, plateRef,
}: {
  player: Player;
  variant: CardVariant;
  /** Undefined when the card is sitting on the bench. */
  slotId?: string;
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
  /**
   * A degree or two off square. Nothing on a board hangs straight, and the
   * scatter has to be STABLE — see `tiltFor` in components/swing.ts, which
   * hashes it out of the position rather than rolling it per render.
   */
  tilt?: number;
  /** A pushpin through the top edge. Red is a pin the string runs through. */
  pin?: 'red' | 'gold' | null;
  /** Play the pin's drive-in rather than having it simply be there. */
  pinDriving?: boolean;
  pinDelay?: number;
  /** Play the landing. Set for one beat after the card is dropped here. */
  landing?: boolean;
  /** The slot's number, printed on the mount the way a contact sheet is marked. */
  index?: number;
  /** Measured to find where the string should be tied. See RedString. */
  plateRef?: (el: HTMLDivElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${slotId ?? 'lib'}:${player.id}`,
    data: { playerId: player.id, fromSlot: slotId },
    disabled: variant === 'given',
  });

  const photo = images[player.id];
  const given = variant === 'given';
  const w = compact ? 92 : 108;
  const h = compact ? 120 : 140;
  const surname = plateName(player.id, player.name).toUpperCase();

  if (ring !== undefined) {
    return (
      <div
        ref={(el) => { setNodeRef(el); plateRef?.(el); }}
        {...listeners}
        {...attributes}
        className="mount"
        title={player.name}
        style={{
          width: w, flexShrink: 0, position: 'relative',
          // The tilt lives in a CSS variable as well as in the transform so
          // the landing keyframes can return to it rather than to square.
          ['--tilt' as string]: `${tilt}deg`,
          ['--land-from' as string]: `${tilt - 3.4}deg`,
          transform: `rotate(${tilt}deg)`,
          // The card being carried is a COPY under the cursor, so the
          // original has to get out of the way — otherwise the same player is
          // on screen twice and the plate looks occupied while you are
          // deciding whether to fill it.
          opacity: isDragging ? 0.28 : 1,
          cursor: given ? 'default' : 'grab',
          touchAction: 'none',
          animation: landing ? 'mount-land 620ms cubic-bezier(0.22, 1.2, 0.36, 1) both' : undefined,
        }}
      >
        {pin ? (
          <Pin
            colour={pin === 'red' ? '#b3341f' : '#a8791f'}
            driving={pinDriving}
            delay={pinDelay}
          />
        ) : null}

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
            <EmptyPlate />
          )}
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
          {obscurity !== null ? (
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
          ) : index !== undefined ? (
            <span className="slab" style={{ fontSize: 15, lineHeight: 1, color: 'rgba(26,20,16,0.34)', flexShrink: 0 }}>
              {index}
            </span>
          ) : null}
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
