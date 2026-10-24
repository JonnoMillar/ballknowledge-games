'use client';
import type { PointerEvent, ReactNode } from 'react';

/**
 * An opened card turns towards the pointer: a mouse just moves over it, a
 * finger drags it. The light sits on the edge turned towards you; let go and
 * it eases back flat (the registered properties transition, globals.css).
 * Wraps one Slab.
 */
export default function CardTilt({ children }: { children: ReactNode }) {
  return (
    <div className="tilt card-detail__tilt" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}>
      {children}
    </div>
  );
}

const TILT = 12;
function start(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== 'mouse') e.currentTarget.setPointerCapture(e.pointerId);
  move(e);
}
function move(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== 'mouse' && !e.currentTarget.hasPointerCapture(e.pointerId)) return;
  const r = e.currentTarget.getBoundingClientRect();
  const x = Math.min(1, Math.max(-1, ((e.clientX - r.left) / r.width) * 2 - 1));
  const y = Math.min(1, Math.max(-1, ((e.clientY - r.top) / r.height) * 2 - 1));
  const st = e.currentTarget.style;
  st.setProperty('--ry', `${(x * TILT).toFixed(2)}deg`);
  st.setProperty('--rx', `${(-y * TILT).toFixed(2)}deg`);
  st.setProperty('--lx', `${(50 + x * 60).toFixed(1)}%`);
  st.setProperty('--ly', `${(50 + y * 60).toFixed(1)}%`);
  st.setProperty('--lit', String(0.35 + (0.65 * Math.hypot(x, y)) / Math.SQRT2));
  e.currentTarget.classList.add('is-held');
}
function end(e: PointerEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  el.classList.remove('is-held');
  ['--rx', '--ry', '--lx', '--ly', '--lit'].forEach((p) => el.style.removeProperty(p));
}
