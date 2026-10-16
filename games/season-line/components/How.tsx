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
const HOLD = [2600, 2800, 2800, 2800, 2800, 4200];

/** The latest guess of each step: a miss on a rival club, a later year than the answer (so the arrow points down). */
const missYear = (step: number) => 1995 + step * 2 + 1;

/**
 * How it goes, as the game itself on a loop: one real board (never dealt)
 * plays through its five guesses, the line stretching, the clues sticking
 * down, then the answer. Each rule lights while the demo shows it. Reduced
 * motion shows the last frame, still.
 */
export default function How({ demo }: { demo: Demo }) {
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

  const shown = step >= 5 ? demo.games : fifths(demo.games)[step]!;
  const done = step >= 5;
  const near = demo.rivals.slice(0, step >= 3 ? 3 : step >= 1 ? 1 : 0);
  const guess = step >= 1 ? demo.rivals[(step - 1) % demo.rivals.length]! : null;
  const lit = (rule: number) => (rule === 0 ? step === 0 : rule === 1 ? step >= 1 && step <= 4 : done);

  return (
    <section className="lobby-card lobby__wide sl-how vt">
      <span className="lobby-tag lobby-tag--paper">How it goes</span>
      <div className="sl-how__body">
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
        <ol className="sl-how__rules">
          <li className={lit(0) || calm ? 'is-lit' : ''}>The line is a club’s league position, game by game.</li>
          <li className={lit(1) || calm ? 'is-lit' : ''}>Five guesses. Each miss stretches the season and adds a clue.</li>
          <li className={lit(2) || calm ? 'is-lit' : ''}>Name the club and the year. Solve it early and the top scorer is a bonus.</li>
        </ol>
      </div>
    </section>
  );
}
