'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { GAMES, type GameCard } from '../src/games';
import { hubStatus, syncHub, type HubStatus } from '../src/lib/today';
import { smooth } from '../src/lib/motion';
import HubTuner from './HubTuner';

type Status = { done: Set<string>; streak: number };

const allDone = (g: GameCard, done: Set<string>) => g.dailies.every((d) => done.has(d));

/** The first game with a daily still to do; once every daily is done, the first that is always open. */
function featured(done: Set<string>): GameCard {
  return GAMES.find((g) => g.dailies.length && !allDone(g, done))
    ?? GAMES.find((g) => !g.dailies.length && !g.pub)
    ?? GAMES[0]!;
}

/**
 * The front door, laid out like a table of games: two large tiles, the
 * suggestion top left (it carries the page's only red button) and the `big`
 * game bottom right, with the rest small in the gaps. Any game can be the
 * suggestion, so a game shifts from small to large once the one before it
 * is done. Each game's miniature stands on its own
 * coloured ground; no blurbs, each game's front page explains itself.
 */
export default function Hub({ initial }: { initial: HubStatus }) {
  // The server lays the board out from the hub cookie (src/lib/today), so a
  // page coming back from a game lands on the real board and nothing moves
  // after. Only a stale or missing cookie (a first visit, a new day)
  // rearranges it here, smoothly, and the cookie is then brought up to date.
  const [status, setStatus] = useState<Status>({ done: new Set(initial.done), streak: initial.streak });
  useEffect(() => {
    const real = hubStatus();
    syncHub();
    if (real.streak !== initial.streak || real.done.join() !== initial.done.join()) {
      void smooth(() => setStatus({ done: new Set(real.done), streak: real.streak }));
    }
  }, [initial]);

  return (
    <div className="app hub">
      <div className="hub__table" aria-hidden />
      {process.env.NODE_ENV === 'development' ? <HubTuner /> : null}
      <header className="masthead">
        <span className="masthead__brand display">Football games</span>
        {process.env.NODE_ENV === 'development' ? <Stub /> : null}
      </header>
      <main className="hub__main">
        <Board status={status} />
      </main>
    </div>
  );
}

function Board({ status }: { status: Status }) {
  const top = featured(status.done);
  const big = GAMES.find((g) => g.big && g !== top);
  const small = GAMES.filter((g) => g !== top && g !== big);
  return (
    <ul className="hub__board">
      <li className="hub__cell hub__cell--feature"><Tile game={top} status={status} size="large" play /></li>
      {small.map((g) => (
        <li key={g.id} className="hub__cell hub__cell--small"><Tile game={g} status={status} size="small" /></li>
      ))}
      {big ? <li className="hub__cell hub__cell--big"><Tile game={big} status={status} size="large" /></li> : null}
    </ul>
  );
}

/** `play`: the red button, on the suggestion only. */
function Tile({ game: g, status, size, play }: { game: GameCard; status: Status; size: 'large' | 'small'; play?: boolean }) {
  const done = g.dailies.length > 0 && allDone(g, status.done);
  const streak = g.id === 'chain' && status.streak > 0 ? status.streak : 0;
  return (
    <a
      className={`hub__tile hub__tile--${size === 'large' ? 'feature' : 'square'}${g.icon ? '' : ' hub__tile--bare'}${done ? ' is-done' : ''}`}
      href={g.href}
      style={{ '--ground': g.ground } as CSSProperties}
      aria-label={`${g.name}${done ? ', done today' : ''}`}
    >
      <span className="hub__ground" style={{ viewTransitionName: `game-${g.id}` }} aria-hidden />
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
      {g.icon ? <img className="hub__mini" src={`/hub/${g.icon}.webp`} alt="" width={480} height={480} style={{ viewTransitionName: `game-${g.id}-mini` }} /> : null}
      <span className="hub__words">
        <span className="hub__name display">{g.name}</span>
        {size === 'large' && g.line ? <span className="hub__line">{g.line}</span> : null}
      </span>
      {play ? <span className="lobby-play hub__play">Play</span> : null}
    </a>
  );
}

/** Draft (dev only): the ticket strip's stub, today's date. */
function Stub() {
  const d = new Date();
  return (
    <span className="masthead__stub display" suppressHydrationWarning>
      <small>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</small>
      {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
    </span>
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
