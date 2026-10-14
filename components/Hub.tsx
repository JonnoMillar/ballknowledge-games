'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { GAMES, type GameCard } from '../src/games';
import { dayNumber, localDate } from '../src/lib/daily';
import { readProgress, streakOf } from '../src/lib/progress';
import { doneToday } from '../src/lib/today';

type Status = { done: Set<string>; streak: number };

const allDone = (g: GameCard, done: Set<string>) => g.dailies.every((d) => done.has(d));

/** The first game with a daily still to do; once every daily is done, the first that is always open. */
function featured(done: Set<string>): GameCard {
  return GAMES.find((g) => g.dailies.length && !allDone(g, done))
    ?? GAMES.find((g) => !g.dailies.length && !g.pub)
    ?? GAMES[0]!;
}

/**
 * The front door, laid out like a table of games: the suggestion is the big
 * tile and carries the page's only red button, the rest sit round it, the
 * pub game runs along the bottom. Each game's miniature stands on its own
 * coloured ground; no blurbs, each game's front page explains itself.
 */
export default function Hub() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => setStatus({ done: doneToday(), streak: streakOf(readProgress(), dayNumber(localDate())).current }), []);

  return (
    <div className="app hub">
      <header className="masthead">
        <span className="masthead__brand display">Football games</span>
      </header>
      <main className="hub__main">
        {status ? <Board status={status} /> : <div className="hub__board hub__board--wait" aria-hidden />}
      </main>
    </div>
  );
}

function Board({ status }: { status: Status }) {
  const top = featured(status.done);
  const rest = GAMES.filter((g) => g !== top);
  return (
    <ul className="hub__board">
      <li className="hub__cell hub__cell--feature"><Tile game={top} status={status} size="feature" /></li>
      {rest.map((g) => (
        <li key={g.id} className={`hub__cell hub__cell--${g.pub ? 'wide' : 'square'}`}>
          <Tile game={g} status={status} size={g.pub ? 'wide' : 'square'} />
        </li>
      ))}
    </ul>
  );
}

function Tile({ game: g, status, size }: { game: GameCard; status: Status; size: 'feature' | 'square' | 'wide' }) {
  const done = g.dailies.length > 0 && allDone(g, status.done);
  const streak = g.id === 'chain' && status.streak > 0 ? status.streak : 0;
  return (
    <a
      className={`hub__tile hub__tile--${size}${done ? ' is-done' : ''}`}
      href={g.href}
      style={{ '--ground': g.ground } as CSSProperties}
      aria-label={`${g.name}${done ? ', done today' : ''}`}
    >
      <span className="hub__tag">
        {g.pub ? <People /> : null}
        {g.tag}
        {streak ? <b className="hub__streak">Streak {streak}</b> : null}
        {g.dailies.length > 1 && !done ? (
          <span className="hub__pips" aria-hidden>
            {g.dailies.map((d) => <i key={d} className={status.done.has(d) ? 'is-on' : ''} />)}
          </span>
        ) : null}
      </span>
      {done ? <span className="hub__done" aria-hidden>✓</span> : null}
      <img className="hub__mini" src={`/hub/${g.icon}.webp`} alt="" width={480} height={480} />
      <span className="hub__words">
        <span className="hub__name display">{g.name}</span>
        {size !== 'square' ? <span className="hub__line">{g.pub ? '2 to 4 players, one phone' : g.line}</span> : null}
      </span>
      {size === 'feature' ? <span className="hub__play display">Play</span> : null}
    </a>
  );
}

function People() {
  return (
    <svg className="hub__people" viewBox="0 0 20 14" aria-hidden>
      <circle cx="6" cy="4" r="2.6" /><circle cx="14" cy="4" r="2.6" />
      <path d="M1 13c0-3 2.2-5 5-5s5 2 5 5zM9 13c0-3 2.2-5 5-5s5 2 5 5z" />
    </svg>
  );
}
