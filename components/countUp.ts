'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Counts from zero to `to` once mounted, or lands on it immediately when the
 * viewer has asked for reduced motion.
 */
export function useCountUp(to: number, delay: number, duration = 700): number {
  const [n, setN] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setN(to); return; }

    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      // Ease-out cubic: fast commitment, soft landing.
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => { frame.current = requestAnimationFrame(tick); }, delay);

    // Frames stop entirely while the tab is hidden, so a count-up driven only
    // by requestAnimationFrame can freeze part-way and stay there — leaving a
    // number on screen that is simply wrong. Timers still fire in a background
    // tab, so this guarantees it lands on the real figure either way.
    const settle = setTimeout(() => {
      cancelAnimationFrame(frame.current);
      setN(to);
    }, delay + duration + 60);

    return () => {
      clearTimeout(timer);
      clearTimeout(settle);
      cancelAnimationFrame(frame.current);
    };
  }, [to, delay, duration]);

  return n;
}
