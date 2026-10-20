'use client';
import { useEffect, useState, type ReactNode } from 'react';

/** One numbered rule, and how long the demo shows each of its frames (ms). Most rules have one frame. */
export interface HowRule { text: ReactNode; frames: number[] }

/**
 * How to play, the same card on every game's front page (2026-10-19): a
 * live demo with real stickers, crests or boards on the left, three short
 * numbered rules on the right, the rule the demo is showing lit.
 *
 * The demo plays each rule's frames in turn and loops. Tapping a rule takes
 * over: the demo jumps to it, plays it once and stays there (tap it again to
 * replay), the way Odd Man Out's demo worked. Reduced motion never loops;
 * it starts on the first rule and moves only when a rule is tapped.
 *
 * `demo(frame)` draws frame `frame` (0-based, counted across all rules); it
 * is remounted when the loop starts over or a rule is tapped, so CSS
 * animations keyed on the frame play from the start.
 */
export default function HowItWorks({ rules, demo, note, extra, title = 'How to play', wide = true, className = '' }: {
  rules: HowRule[];
  demo: (frame: number) => ReactNode;
  /** One small line under the rules (the source, the size of the pool). */
  note?: ReactNode;
  /** Something the rules need to be read (Pitch pin's scale), under them. */
  extra?: ReactNode;
  /** The card's name: 'How to play', unless a page holds two games. */
  title?: string;
  /** Across the page (the default), or half of it beside another card. */
  wide?: boolean;
  className?: string;
}) {
  const starts = rules.map((_, i) => rules.slice(0, i).reduce((n, r) => n + r.frames.length, 0));
  const holds = rules.flatMap((r) => r.frames);
  const ruleOf = (f: number) => starts.filter((s) => s <= f).length - 1;

  const [frame, setFrame] = useState(0);
  const [run, setRun] = useState(0);
  // Looping, until someone taps a rule (or always off under reduced motion).
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(false);
  }, []);

  useEffect(() => {
    const last = frame === holds.length - 1;
    // Tapped: play the rule's own frames, then hold on its last.
    if (!auto && (last || ruleOf(frame + 1) !== ruleOf(frame))) return;
    const t = setTimeout(() => {
      if (last) { setFrame(0); setRun((r) => r + 1); } else setFrame(frame + 1);
    }, holds[frame]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, run, auto]);

  const pick = (i: number) => {
    setAuto(false);
    setFrame(starts[i]!);
    setRun((r) => r + 1);
  };
  const on = ruleOf(frame);

  return (
    <section className={`lobby-card${wide ? ' lobby__wide' : ''} how vt ${className}`}>
      <h2 className="lobby-tag lobby-tag--paper">{title}</h2>
      <div className="how__body">
        <div className="how__stage" key={run} data-frame={frame} aria-hidden>
          {demo(frame)}
        </div>
        <div className="how__side">
          <ol className="how__rules">
            {rules.map((r, i) => (
              <li key={i}>
                <button type="button" className={`how__rule${i === on ? ' is-on' : ''}`} aria-current={i === on ? 'step' : undefined} onClick={() => pick(i)}>
                  <span className="how__no display">{i + 1}</span>
                  <span className="how__text">{r.text}</span>
                </button>
              </li>
            ))}
          </ol>
          {extra}
          {note ? <p className="how__note">{note}</p> : null}
        </div>
      </div>
    </section>
  );
}
