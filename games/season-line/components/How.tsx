'use client';
import { fifths } from '../lib/table';
import Chart, { type Runner } from './Chart';
import { Clue, Crest } from './Clue';
import HowItWorks, { type HowRule } from '../../../components/HowItWorks';

export interface Demo {
  games: number;
  teams: number;
  me: Runner;
  rivals: (Runner & { club: string; name: string })[];
  squad: string;
  top: { names: string[]; goals: number };
  answer: { name: string; season: string };
}

/** The latest guess of each step: a miss on a rival club, a later year than the answer (so the arrow points down). */
const missYear = (step: number) => 1995 + step * 2 + 1;

/**
 * The game, played by itself: one real board (never dealt) through its five
 * guesses, the line stretching and the clues sticking down, then the
 * answer. Steps 0 to 5 (5 is the reveal); rule 2 covers steps 1 to 4.
 */
const RULES: HowRule[] = [
  { text: 'The line is a club’s league position, game by game. Name the club and season.', frames: [2800] },
  { text: 'Each miss shows more games and adds a clue.', frames: [2400, 2400, 2400, 2400] },
  { text: 'Solve it in four for a bonus guess at the top scorer.', frames: [4200] },
];

function DemoView({ demo, step }: { demo: Demo; step: number }) {
  const done = step >= 5;
  const shown = done ? demo.games : fifths(demo.games)[step]!;
  const near = demo.rivals.slice(0, step >= 3 ? 3 : step >= 1 ? 1 : 0);
  const guess = step >= 1 ? demo.rivals[(step - 1) % demo.rivals.length]! : null;
  return (
    <div className="sl-demo" aria-hidden>
      <div className="sl-demo__chart">
        <Chart games={demo.games} teams={demo.teams} line={demo.me.line.slice(0, shown)}
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

/** How to play, on the shared card. */
export default function How({ demo }: { demo: Demo }) {
  return <HowItWorks rules={RULES} demo={(step) => <DemoView demo={demo} step={step} />} />;
}
