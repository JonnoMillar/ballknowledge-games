'use client';
import { useEffect, useState } from 'react';
import Lives from './Lives';
import { LIVES } from '../lib/match';
import HowItWorks, { type HowRule } from '../../../components/HowItWorks';

const RULES: HowRule[] = [
  { text: 'One of you swaps a player in a real team sheet.', frames: [2600] },
  { text: 'Cover the screen and pass the phone.', frames: [2400] },
  { text: 'Tap the fake. A wrong tap costs a heart.', frames: [5200] },
];

/** A real XI to demo with: the 2019 Champions League final. The swapped player is the fourth line, middle. */
const XI = [['Alisson'], ['Trent', 'Matip', 'Van Dijk', 'Robertson'], ['Henderson', 'Fabinho', 'Wijnaldum'], ['Mané', 'Firmino', 'Salah']];

/** How to play, on the shared card: a small phone playing one round. */
export default function HowDemo({ note }: { note: string }) {
  return <HowItWorks rules={RULES} note={note} demo={(step) => <Phone step={step} />} />;
}

function Phone({ step }: { step: number }) {
  const [lives, setLives] = useState(LIVES);
  // The heart goes when the wrong tap lands, not as the frame starts.
  useEffect(() => {
    if (step < 2) { setLives(LIVES); return; }
    setLives(LIVES);
    const t = setTimeout(() => setLives(LIVES - 1), 900);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="hd__phone" data-step={step}>
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
          <span className="hd__tap hd__tap--right" />
          <span className="hd__tag">Fake · Agüero</span>
        </div>
        <div className="hd__cover">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.4" /><path d="M11 18.5h2" /></svg>
          <span className="display">Hand to Ben</span>
        </div>
      </div>
    </div>
  );
}
