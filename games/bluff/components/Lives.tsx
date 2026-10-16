'use client';
import { useEffect, useRef, useState } from 'react';
import { LIVES } from '../lib/match';

const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 4.5 6.4 4.5c2.2 0 3.7 1.2 5.6 3.3 1.9-2.1 3.4-3.3 5.6-3.3 3.7 0 5.5 3.9 4 7.3C19.5 16.4 12 21 12 21z';

/** Lives as hearts. The one just lost pops, drains to an outline and floats a ghost heart up. */
export default function Lives({ lives, max = LIVES, size = 17 }: { lives: number; max?: number; size?: number }) {
  const prev = useRef(lives);
  const [lost, setLost] = useState<number | null>(null);
  useEffect(() => {
    const dropped = lives < prev.current;
    prev.current = lives;
    if (!dropped) return;
    setLost(lives);
    const t = setTimeout(() => setLost(null), 1000);
    return () => clearTimeout(t);
  }, [lives]);

  return (
    <span className="bf-lives" role="img" aria-label={`${lives} of ${max} lives`}>
      {Array.from({ length: max }, (_, k) => (
        <span key={k} className={`bf-heart${k < lives ? ' is-on' : ''}${k === lost ? ' is-lost' : ''}`} style={{ width: size, height: size }}>
          <svg viewBox="0 0 24 24" aria-hidden><path d={HEART} /></svg>
          {k === lost ? <svg className="bf-heart__ghost" viewBox="0 0 24 24" aria-hidden><path d={HEART} /></svg> : null}
        </span>
      ))}
    </span>
  );
}
