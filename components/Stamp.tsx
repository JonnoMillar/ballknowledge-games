'use client';
import { useId, type ReactNode } from 'react';
import ClubBadge, { shortClubName } from './ClubBadge';
import type { ClubView } from '../src/lib/clubs';

/**
 * A rubber stamp, coming down on the sheet.
 *
 * The verdict on each link used to be a crest that was simply there once the
 * chain was sealed. Nothing landed. This is the die arriving: from above at
 * near double size, a hard stop, a fraction of overshoot, and a halo of ink
 * pressed out from under it. The paper's own jolt is the caller's job — the
 * stamp does not know it is on a sheet.
 *
 * Two dies. A link that held gets the club that made it, crest and name,
 * inside a round green ring — the customs-stamp shape, because the crest is
 * the fact the player was reaching for and this is where it gets confirmed.
 * A link that did not hold gets NO LINK in red, and no crest, because there
 * is no club to show.
 *
 * The ink filter is what stops it looking like a bordered div: a die never
 * presses evenly, so the edges break up a little.
 */
/**
 * The ink filter, for anything that wants to look pressed rather than drawn.
 * Returns the defs to render once and the `filter` value to point at them;
 * the id is per caller so two stamps on one sheet do not fight.
 */
export function useInk(): { defs: ReactNode; filter: string } {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  return {
    filter: `url(#ink-${id})`,
    defs: (
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={`ink-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feComponentTransfer in="d"><feFuncA type="table" tableValues="0 0.55 1 1" /></feComponentTransfer>
          </filter>
        </defs>
      </svg>
    ),
  };
}

export default function Stamp({
  held, clubId, club, size = 62, lean = -7, delay = 0, locked = false,
}: {
  held: boolean;
  /** The club that made the link. Ignored when `held` is false. */
  clubId?: string;
  club?: ClubView;
  size?: number;
  /** Degrees. Nobody stamps square. */
  lean?: number;
  delay?: number;
  /** The chain has locked: the die takes one pulse. See `card-lock`. */
  locked?: boolean;
}) {
  const { defs, filter } = useInk();
  const ink = held ? 'var(--green)' : 'var(--accent)';
  const haloRgb = held ? '47,107,63' : '179,52,31';

  return (
    <div aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, zIndex: 3, pointerEvents: 'none' }}>
      {defs}

      {/* The ink pressed out from under the die. */}
      <span
        style={{
          position: 'absolute', left: 0, top: 0,
          width: size * 1.1, height: size * 1.1, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${haloRgb},0.36), rgba(${haloRgb},0.12) 45%, transparent 68%)`,
          animation: `stamp-halo 560ms ease-out ${delay + 120}ms both`,
        }}
      />

      <span
        className="narrow"
        style={{
          position: 'absolute', left: 0, top: 0,
          width: size, height: size, borderRadius: '50%',
          ['--lean' as string]: `${lean}deg`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
          border: `2.6px solid ${ink}`, color: ink,
          background: 'rgba(247,242,230,0.55)',
          boxShadow: `inset 0 0 0 1.5px rgba(247,242,230,0.9), inset 0 0 0 2.6px ${ink}`,
          filter,
          animation: locked
            ? 'die-lock 520ms cubic-bezier(0.3, 1.2, 0.4, 1) both'
            : `stamp-in 380ms cubic-bezier(0.3, 1.2, 0.4, 1) ${delay}ms both`,
        }}
      >
        {held && clubId ? (
          <>
            <span style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))' }}>
              <ClubBadge clubId={clubId} club={club} size={Math.round(size * 0.4)} />
            </span>
            {/* The name sits below the centre, where the ring is narrower
                than the die is wide, so it gets a chord's width and two
                lines rather than a diameter and an ellipsis: REAL MADRID
                was arriving as REAL MADR. */}
            <span style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1, maxWidth: size * 0.66, textWrap: 'balance', overflowWrap: 'anywhere' }}>
              {shortClubName(club?.name ?? clubId)}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1 }}>NO</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', lineHeight: 1 }}>LINK</span>
          </>
        )}
      </span>
    </div>
  );
}
