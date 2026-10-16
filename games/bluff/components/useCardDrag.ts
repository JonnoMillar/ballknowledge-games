'use client';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { At } from '../lib/match';
import type { Named } from '../lib/types';

export interface Dragging { p: Named; x: number; y: number; w: number }

/**
 * Drag a suggested card onto a card on the pitch. Pointer events, so a finger
 * works as well as a mouse; a card only starts to drag after it has moved a
 * few pixels, so a tap is still a tap. The pitch's cards are found by
 * `data-at="line:place"` under the pointer.
 */
export function useCardDrag(onDrop: (at: At, p: Named) => void) {
  const [drag, setDrag] = useState<Dragging | null>(null);
  const [over, setOver] = useState<At | null>(null);
  const drop = useRef(onDrop);
  drop.current = onDrop;
  const justDragged = useRef(false);

  const slotUnder = (x: number, y: number): At | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-at]');
    if (!el?.dataset.at) return null;
    const [l, k] = el.dataset.at.split(':').map(Number);
    return [l!, k!];
  };

  /** Props for a card that can be dragged. */
  const grab = (p: Named) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const x0 = e.clientX;
      const y0 = e.clientY;
      const w = e.currentTarget.getBoundingClientRect().width;
      let live = false;
      const move = (ev: PointerEvent) => {
        if (!live && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
        live = true;
        setDrag({ p, x: ev.clientX, y: ev.clientY, w });
        setOver(slotUnder(ev.clientX, ev.clientY));
      };
      const end = (ev: PointerEvent, cancelled: boolean) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        if (live) {
          justDragged.current = true;
          setTimeout(() => { justDragged.current = false; }, 0);
          const at = cancelled ? null : slotUnder(ev.clientX, ev.clientY);
          if (at) drop.current(at, p);
        }
        setDrag(null);
        setOver(null);
      };
      const up = (ev: PointerEvent) => end(ev, false);
      const cancel = (ev: PointerEvent) => end(ev, true);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
    },
    /** A drag can end in a click; the card ignores that one. */
    wasDrag: () => justDragged.current,
  });

  return { drag, over, grab };
}
