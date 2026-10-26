'use client';
import type React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Named } from '../src/lib/chain/client';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

/**
 * The ground behind a sticker's photo: two halves, split on the diagonal.
 *
 * Each half is one of the sticker's two links. A given wears its signature
 * club on both halves from the first render. A pick wears the neutral grey
 * until the chain is sealed, then each half DEVELOPS as its link is judged:
 * the club colour arrives from that link's corner, or red if the link did
 * not hold. That is the reveal changing the card, rather than a stamp
 * changing the page around it.
 */
export interface Ground {
  /** The upper-left half: the first link's side. */
  a: string;
  /** The lower-right half: the second link's side. */
  b: string;
  liveA: boolean;
  liveB: boolean;
}

export const NEUTRAL_GROUND = 'var(--ground-neutral)';

/** A plain ground, on from the start. */
export const solid = (colour: string): Ground => ({ a: colour, b: colour, liveA: true, liveB: true });
export const neutral = (): Ground => ({ a: NEUTRAL_GROUND, b: NEUTRAL_GROUND, liveA: false, liveB: false });

export default function Sticker({
  player, image, ground, index, dragId, fromSlot, landing = false, lifted = false, shake = false,
}: {
  player: Named;
  image: PortraitImage | undefined;
  ground: Ground;
  /** The slot number printed in the corner. */
  index?: number;
  /** A draggable id; omit to make the sticker inert. */
  dragId?: string;
  fromSlot?: string;
  /** Play the stick-down once, the beat after a drop. */
  landing?: boolean;
  /** The copy under the cursor. */
  lifted?: boolean;
  /** A sticker that would not stick: one shake, when a link on it breaks. */
  shake?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId ?? `inert:${player.id}`,
    data: { playerId: player.id, fromSlot },
    disabled: dragId === undefined,
  });
  const classes = [
    dragId ? 'sticker--draggable' : '',
    isDragging ? 'sticker--dragging' : '',
    landing ? 'sticker--landing' : '',
    lifted ? 'sticker--lifted' : '',
    shake ? 'sticker--shake' : '',
  ].filter(Boolean).join(' ');

  return (
    <StickerFace
      ref={setNodeRef}
      {...(dragId ? listeners : {})}
      {...(dragId ? attributes : {})}
      className={classes}
      player={player}
      image={image}
      ground={ground}
      index={index}
    />
  );
}

/**
 * The sticker itself, with no behaviour: the photo on its ground, the
 * plate, the number. The board wraps it in a draggable; the home page and
 * the wall draw it as it is.
 */
export function StickerFace({
  player, image, ground, index, className = '', ref, ...rest
}: {
  player: Named;
  image: PortraitImage | undefined;
  ground: Ground;
  index?: number;
  className?: string;
  ref?: (node: HTMLElement | null) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className'>) {
  const name = plateName(player.id, player.name).toUpperCase();
  const seam = ground.liveA && ground.liveB && ground.a !== ground.b;
  return (
    <div ref={ref} {...rest} className={`sticker${image ? ' sticker--shot' : ''} ${className}`} title={player.name}>
      <div className={`sticker__photo ${image?.fit === 'contain' ? 'sticker__photo--contain' : 'sticker__photo--cover'}`}>
        <span className={`sticker__half sticker__half--a ${ground.liveA ? 'is-live' : ''}`} style={{ background: ground.a }} aria-hidden />
        <span className={`sticker__half sticker__half--b ${ground.liveB ? 'is-live' : ''}`} style={{ background: ground.b }} aria-hidden />
        <span className={`sticker__seam ${seam ? 'is-live' : ''}`} aria-hidden />
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
