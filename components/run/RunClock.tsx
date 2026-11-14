'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * One item's clock in the daily run: an ink bar that drains under the task's
 * header. It caps the item and never scores. When it runs out, `onEnd`
 * locks the item with what the player has. `running` false freezes it (the
 * item is answered, or being judged). Key it by item to start a new one.
 */
export default function RunClock({ ms, running, onEnd }: { ms: number; running: boolean; onEnd: () => void }) {
  const end = useRef(onEnd);
  end.current = onEnd;
  const left = useRef(ms);
  // Already answered when it mounted (a reload): the time is spent, show the bar empty.
  const [spent] = useState(!running);
  useEffect(() => {
    if (!running || left.current <= 0) return;
    const started = performance.now();
    const t = window.setTimeout(() => { left.current = 0; end.current(); }, left.current);
    return () => { clearTimeout(t); left.current = Math.max(0, left.current - (performance.now() - started)); };
  }, [running]);
  return (
    <div className="run-clock" role="timer" aria-label={`${Math.round(ms / 1000)} second clock`}>
      <span className="run-clock__ink" style={spent ? { transform: 'scaleX(0)', animation: 'none' } : { animationDuration: `${ms}ms`, animationPlayState: running ? 'running' : 'paused' }} />
    </div>
  );
}
