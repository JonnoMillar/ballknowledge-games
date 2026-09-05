'use client';
import { useEffect, useRef, useState } from 'react';
import type { SlotDepth } from '../src/lib/chain/score';

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

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}TH`;
  return `${n}${['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH'}`;
};

/**
 * The depth gauge — how far down you dug for this pick.
 *
 * The track is the whole field of players who would have completed this link,
 * laid out most famous on the left to most obscure on the right. The marker is
 * where the one you found actually sits.
 *
 * A plain 0-100 score hides what makes this mode worth playing: the gate is
 * naming anyone who links, and the score is naming someone nobody else would
 * have. "The 6th most obscure of 247 who fit" says that; "49" does not.
 *
 * No names are ever shown here — only the size of the field. It appears after
 * the chain is locked in, so even the count cannot help anyone solve it.
 */
export default function DepthGauge({ depth, delay }: { depth: SlotDepth; delay: number }) {
  const [armed, setArmed] = useState(false);
  const rank = useCountUp(depth.rank ?? 0, delay);
  const field = useCountUp(depth.fieldSize, delay);

  useEffect(() => {
    const t = setTimeout(() => setArmed(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  // A pick that does not link has no place on the gauge, so say that plainly
  // rather than drawing a marker at zero and implying a result.
  if (depth.rank === null) {
    return (
      <div style={{ width: 108, marginTop: 10, textAlign: 'center' }}>
        <div className="cond" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--dim)' }}>
          NO LINK
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 108, marginTop: 10, opacity: armed ? 1 : 0,
        transform: armed ? 'none' : 'translateY(5px)',
        transition: 'opacity 320ms ease, transform 320ms ease',
      }}
    >
      <div
        style={{
          position: 'relative', height: 4, borderRadius: 2,
          // Famous on the left, obscure on the right. The track darkens toward
          // the obscure end so a marker far right reads as "deep".
          background: 'linear-gradient(90deg, #223050, var(--gold))',
          opacity: 0.5,
        }}
      >
        <span
          style={{
            position: 'absolute', top: -3, left: `${armed ? depth.score : 0}%`,
            width: 3, height: 10, borderRadius: 1, marginLeft: -1.5,
            background: 'var(--gold-light)',
            boxShadow: '0 0 8px var(--gold)',
            transition: 'left 780ms cubic-bezier(0.16, 0.84, 0.3, 1)',
          }}
        />
      </div>

      <div
        className="cond"
        style={{
          marginTop: 6, textAlign: 'center', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', color: 'var(--gold)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {ordinal(rank)} MOST OBSCURE
      </div>
      <div
        style={{
          textAlign: 'center', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.13em', color: 'var(--muted)', marginTop: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        OF {field} WHO FIT
      </div>
    </div>
  );
}
