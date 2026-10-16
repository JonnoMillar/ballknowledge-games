'use client';
import { useEffect, useState } from 'react';
import { fifths } from '../lib/table';
import Chart, { type Runner } from './Chart';
import { Clue, Crest } from './Clue';

export interface Demo {
  games: number;
  teams: number;
  me: Runner;
  rivals: (Runner & { club: string; name: string })[];
  squad: string;
  top: { names: string[]; goals: number };
  answer: { name: string; season: string };
}

/** What the demo does at each step: [how long it holds, in ms]. A loop of the real game's five steps, then the reveal. */
const HOLD = [2600, 2600, 2600, 2600, 2600, 4200];

/** The latest guess of each step: a miss on a rival club, a later year than the answer (so the arrow points down). */
const missYear = (step: number) => 1995 + step * 2 + 1;

/**
 * The game on a loop: one real board (never dealt) plays through its five
 * guesses, the line stretching, the clues sticking down, then the answer.
 * `step` runs 0 to 5 (5 is the reveal); `cycle` changes each time it starts
 * over. Reduced motion holds the last frame.
 */
export function useLoop() {
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setCalm(true); setStep(5); return; }
    const t = setTimeout(() => {
      if (step === HOLD.length - 1) { setCycle((c) => c + 1); setStep(0); } else setStep(step + 1);
    }, HOLD[step]);
    return () => clearTimeout(t);
  }, [step]);
  return { step, cycle, calm };
}

export function Demo({ demo, step, cycle }: { demo: Demo; step: number; cycle: number }) {
  const done = step >= 5;
  const shown = done ? demo.games : fifths(demo.games)[step]!;
  const near = demo.rivals.slice(0, step >= 3 ? 3 : step >= 1 ? 1 : 0);
  const guess = step >= 1 ? demo.rivals[(step - 1) % demo.rivals.length]! : null;
  return (
    <div className="sl-demo" aria-hidden>
      <div className="sl-demo__chart">
        <Chart key={cycle} games={demo.games} teams={demo.teams} line={demo.me.line.slice(0, shown)}
          me={{ colour: done ? demo.me.colour : '#141210', q: done ? demo.me.q : null, name: done ? demo.answer.name : undefined }}
          rivals={near.map((r) => ({ ...r, line: r.line.slice(0, shown) }))} />
      </div>
      <div className="sl-demo__side">
        <ul className="sl-clues">
          <Clue kind="squad" label="Squad" name={step >= 2 ? demo.squad : null} />
          <Clue kind="top" label="Top scorer" name={step >= 4 ? demo.top.names.join(' & ') : null} note={step >= 4 ? `${demo.top.goals} goals` : undefined} />
        </ul>
        <div className="sl-demo__row">
          {done ? (
            <>
              <span className="sl-row__club is-right"><Crest q={demo.me.q} /><span>{demo.answer.name}</span></span>
              <span className="sl-row__season is-right">{demo.answer.season}</span>
            </>
          ) : guess ? (
            <>
              <span key={step} className="sl-row__club"><Crest q={guess.q} /><span>{guess.name}</span></span>
              <span key={`s${step}`} className="sl-row__season">{missYear(step)}/{String((missYear(step) + 1) % 100).padStart(2, '0')}<i className="is-down">▼</i></span>
            </>
          ) : <span className="sl-row__n">Guess 1</span>}
        </div>
      </div>
    </div>
  );
}

/** The three rules, each lit while the demo shows it (all lit when it is still). */
export function Rules({ step, still }: { step: number; still: boolean }) {
  const lit = (rule: number) => still || (rule === 0 ? step === 0 : rule === 1 ? step >= 1 && step <= 4 : step >= 5);
  return (
    <ol className="sl-how__rules">
      <li className={lit(0) ? 'is-lit' : ''}>The line is a club’s league position.</li>
      <li className={lit(1) ? 'is-lit' : ''}>Each miss adds games and a clue.</li>
      <li className={lit(2) ? 'is-lit' : ''}>Solve it early for a bonus guess.</li>
    </ol>
  );
}
