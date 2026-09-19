'use client';
import { useDraggable } from '@dnd-kit/core';
import type { Named } from '../src/lib/chain/client';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

/**
 * A player, as a sticker.
 *
 * White border, a photo on a flat ground, the name in caps on the plate and
 * the slot number in the corner. The ground is the card's one variable: a
 * given wears its club from the start, a pick wears neutral grey until the
 * chain is sealed, and after the seal the ground names the clubs that made
 * the pick fit. See `groundFor` in Chain.tsx.
 *
 * Draggable when `dragId` is given (desktop drag-to-swap); otherwise inert,
 * which is also what the drag overlay renders.
 */
export default function Sticker({
  player, image, ground, index, dragId, fromSlot, landing = false, lifted = false,
}: {
  player: Named;
  image: PortraitImage | undefined;
  /** CSS background for the ground behind the photo. */
  ground: string;
  /** The slot number printed in the corner. */
  index?: number;
  /** A draggable id; omit to make the sticker inert. */
  dragId?: string;
  fromSlot?: string;
  /** Play the stick-down once, the beat after a drop. */
  landing?: boolean;
  /** The copy under the cursor. */
  lifted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId ?? `inert:${player.id}`,
    data: { playerId: player.id, fromSlot },
    disabled: dragId === undefined,
  });
  const name = plateName(player.id, player.name).toUpperCase();
  const classes = [
    'sticker',
    dragId ? 'sticker--draggable' : '',
    isDragging ? 'sticker--dragging' : '',
    landing ? 'sticker--landing' : '',
    lifted ? 'sticker--lifted' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      {...(dragId ? listeners : {})}
      {...(dragId ? attributes : {})}
      className={classes}
      title={player.name}
    >
      <div
        className={`sticker__photo ${image?.fit === 'contain' ? 'sticker__photo--contain' : 'sticker__photo--cover'}`}
        style={{ ['--ground' as string]: ground }}
      >
        {image ? <img src={image.url} alt="" draggable={false} /> : <Figure tone="rgba(255,255,255,0.45)" />}
      </div>
      <div className="sticker__plate">
        <span className={`sticker__name ${name.length > 10 ? 'sticker__name--long' : ''}`}>{name}</span>
        {index !== undefined ? <span className="sticker__no">{index}</span> : null}
      </div>
    </div>
  );
}

/** The silhouette. Head and shoulders, filling the frame from the floor. */
export function Figure({ tone }: { tone: string }) {
  return (
    <svg className="sticker__figure" viewBox="0 0 80 100" aria-hidden preserveAspectRatio="xMidYMax slice">
      <circle cx="40" cy="36" r="17" fill={tone} />
      <path d="M8 100 C8 76 22 64 40 64 C58 64 72 76 72 100 Z" fill={tone} />
    </svg>
  );
}

/**
 * The missing sticker.
 *
 * A grey silhouette with its number: the "need" in got, got, need. It is a
 * button because tapping it is how a player is chosen for the slot.
 */
export function EmptySticker({
  index, focused, over, onFocus, hint = 'Tap to fill',
}: {
  index: number;
  focused: boolean;
  over: boolean;
  onFocus: (i: number) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onFocus(index)}
      aria-label={`Choose a player for slot ${index + 1}`}
      className={`sticker sticker--empty ${focused ? 'is-focused' : ''} ${over ? 'is-over' : ''}`}
    >
      <span className="sticker__photo">
        <Figure tone="var(--silhouette-figure)" />
      </span>
      <span className="sticker__plate">
        <span className="sticker__hint">{hint}</span>
        <span className="sticker__no">{index + 1}</span>
      </span>
    </button>
  );
}
