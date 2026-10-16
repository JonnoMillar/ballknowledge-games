'use client';
import { useEffect, useState } from 'react';
import Lives from './Lives';
import { LIVES } from '../lib/match';

const STEP_MS = 3600;

const STEPS = [
  { title: 'Swap a player', sub: 'One of you sees a real XI and swaps any one player for anyone.' },
  { title: 'Pass the phone', sub: 'Cover it up and hand it over. No peeking.' },
  { title: 'Find the fake', sub: `Tap who you think it is. A wrong tap costs a heart, and you go again.` },
  { title: 'Caught, or not', sub: `Spot it and the faker's card is turned over. Lose all ${LIVES} hearts and you're out.` },
];

/** A real XI to demo with: the 2019 Champions League final. The swapped player is the fourth line, middle. */
const XI = [['Alisson'], ['Trent', 'Matip', 'Van Dijk', 'Robertson'], ['Henderson', 'Fabinho', 'Wijnaldum'], ['Mané', 'Firmino', 'Salah']];

/**
 * How it goes, shown rather than told: a small phone playing a round on a
 * loop, one step at a time, with the four steps beside it to jump to. It
 * only moves by itself for people who have not asked for reduced motion.
 */
export default function HowDemo() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [lives, setLives] = useState(LIVES);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(false);
  }, []);
  // The heart goes when the wrong tap lands, not as the step starts.
  useEffect(() => {
    if (step < 2) { setLives(LIVES); return; }
    if (step > 2) { setLives(LIVES - 1); return; }
    const t = setTimeout(() => setLives(LIVES - 1), 900);
    return () => clearTimeout(t);
  }, [step]);
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [step, auto]);

  return (
    <div className="hd">
      <div className="hd__phone" data-step={step} aria-hidden>
        <div className="hd__top">
          <span className="hd__who">Ben</span>
          <Lives lives={lives} size={13} />
        </div>
        <div className="hd__stage">
        <div className="hd__pitch">
          {XI.map((line, l) => (
            <div key={l} className="hd__line">
              {line.map((name, k) => {
                const target = l === 3 && k === 1;
                const wrong = l === 2 && k === 0;
                return (
                  <span key={name} className={`hd__card${target ? ' hd__card--target' : ''}${wrong ? ' hd__card--wrong' : ''}`}>
                    {target ? (
                      <>
                        <span className="hd__a">{name}</span>
                        <span className="hd__b">Agüero</span>
                        <span className="hd__c">{name}</span>
                      </>
                    ) : name}
                  </span>
                );
              })}
            </div>
          ))}
          <span className="hd__tap" />
          <span className="hd__tag">Fake · Agüero</span>
        </div>
        <div className="hd__cover">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.4" /><path d="M11 18.5h2" /></svg>
          <span className="display">Hand to Ben</span>
        </div>
        </div>
      </div>

      <ol className="hd__steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button type="button" className={`hd__step${i === step ? ' is-on' : ''}`} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>
              <span className="hd__no display">{i + 1}</span>
              <span className="hd__text">
                <b>{s.title}</b>
                <span>{s.sub}</span>
              </span>
              {i === step && auto ? <span className="hd__bar" key={step} style={{ animationDuration: `${STEP_MS}ms` }} /> : null}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
