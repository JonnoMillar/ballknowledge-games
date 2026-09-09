'use client';

/**
 * A pushpin.
 *
 * Two details do all the work and both are easy to leave out. The shaft is
 * drawn going *into* the board at an angle, which is what says the pin is
 * through something rather than printed on it; and the head carries a hard
 * specular dot rather than a soft gradient, because a moulded plastic pin has
 * one bright point on it and a gradient reads as a sticker.
 *
 * The shadow is separate and sits underneath, so the drop can fade it in a
 * beat after the pin lands.
 */
/**
 * How far down from the host element's top edge the pin's head sits, and how
 * far in from its centre.
 *
 * The first draft hung the pin so its head straddled the mount's top edge,
 * which is where a pin looks if it is resting ON the card rather than through
 * it. Driven properly it sits a few millimetres in from the edge, biting the
 * print. Exported because the red string is tied to the head and has to know
 * where it ended up — see LockIn's anchor measurement.
 */
export const pinHead = (size = 18) => ({
  /** Offset of the pin box from the host's top edge. */
  top: Math.round(size * 0.08),
  /** Head centre, relative to the host's top-left. */
  cx: -size / 2 + (9.6 / 20) * size,
  cy: Math.round(size * 0.08) + (8.2 / 20) * size,
});

export default function Pin({
  size = 18, colour = '#b3341f', driving = false, delay = 0,
}: {
  size?: number;
  /** The head. Red for a chain the string will run through; gold elsewhere. */
  colour?: string;
  /** Play the drive-in. Otherwise the pin is simply there. */
  driving?: boolean;
  delay?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', top: pinHead(size).top, left: '50%',
        transform: 'translate(-50%, 0)', zIndex: 5,
        width: size, height: size, display: 'block', pointerEvents: 'none',
        animation: driving ? `pin-drive 460ms cubic-bezier(0.22, 1.5, 0.36, 1) ${delay}ms both` : undefined,
      }}
    >
      {/* The wall taking the hit. Fires once, under the head. */}
      {driving ? (
        <span
          style={{
            position: 'absolute', top: '58%', left: '50%',
            width: size * 2.6, height: size * 2.6, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,20,16,0.34), transparent 66%)',
            animation: `pin-thud 620ms ease-out ${delay + 150}ms both`,
          }}
        />
      ) : null}

      <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id={`pinhead-${colour.replace(/[^a-z0-9]/gi, '')}`} cx="34%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.78" />
            <stop offset="30%" stopColor={colour} />
            <stop offset="78%" stopColor={colour} />
            <stop offset="100%" stopColor="#000" stopOpacity="0.34" />
          </radialGradient>
        </defs>

        {/* Cast shadow: down and to the right, the same direction everything
            else on this desk is lit from. */}
        <ellipse cx="12.4" cy="15.4" rx="5.4" ry="2.5" fill="rgba(26,20,16,0.30)" />

        {/* The shaft, going into the board. Only the exposed bit is drawn. */}
        <path d="M10 9.6 L15.1 17.2" stroke="#7f848a" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M11.4 11.7 L14.6 16.5" stroke="rgba(255,255,255,0.55)" strokeWidth="0.65" strokeLinecap="round" />

        <circle cx="9.6" cy="8.2" r="6.4" fill={`url(#pinhead-${colour.replace(/[^a-z0-9]/gi, '')})`} />
        <circle cx="9.6" cy="8.2" r="6.4" fill="none" stroke="rgba(26,20,16,0.45)" strokeWidth="0.8" />
        {/* The one bright point. */}
        <ellipse cx="7.2" cy="5.6" rx="2.15" ry="1.5" fill="#fff" opacity="0.9" transform="rotate(-28 7.2 5.6)" />
      </svg>
    </span>
  );
}
