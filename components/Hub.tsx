'use client';
import { useEffect, useState } from 'react';
import { GAMES, type GameCard } from '../src/games';
import { dayNumber, localDate } from '../src/lib/daily';
import { readProgress, streakOf } from '../src/lib/progress';
import { doneOn } from '../src/lib/today';

type Status = { done: Set<string>; streak: number };

/** What this browser has done today. Chain keeps its own record; the rest mark themselves in `today`. */
function readStatus(): Status {
  const today = dayNumber(localDate());
  const progress = readProgress();
  const done = new Set(GAMES.filter((g) => g.id !== 'chain' && doneOn(g.id)).map((g) => g.id));
  if (Object.values(progress.plays).some((p) => p.day === today)) done.add('chain');
  return { done, streak: streakOf(progress, today).current };
}

/** The first daily not done today; once they all are, the first game that is always open. */
function upNext({ done }: Status): GameCard {
  return GAMES.find((g) => g.daily && !done.has(g.id)) ?? GAMES.find((g) => !g.daily && !g.pub) ?? GAMES[0]!;
}

/**
 * The front door: one suggestion with the page's only red button, then every
 * game as an icon. No blurbs; each game's own front page explains itself.
 */
export default function Hub() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => setStatus(readStatus()), []);
  const next = status ? upNext(status) : null;

  return (
    <div className="app hub">
      <header className="masthead">
        <span className="masthead__brand display">Football games</span>
      </header>
      <main className="hub__main">
        {next && status ? (
          <a className="hub__next" href={next.href}>
            <img className="hub__icon hub__icon--next" src={`/hub/${next.icon}.webp`} alt="" width={384} height={384} />
            <span className="hub__nexttext">
              <span className="hub__nextname display">{next.name}</span>
              <span className="hub__nextline">
                {next.line}
                {next.id === 'chain' && status.streak > 0 ? <span className="pill hub__streak">Streak {status.streak}</span> : null}
              </span>
            </span>
            <span className="hub__play display">Play</span>
          </a>
        ) : (
          <div className="hub__next hub__next--wait" aria-hidden />
        )}
        <ul className="hub__grid">
          {GAMES.map((g) => {
            const done = status?.done.has(g.id) ?? false;
            return (
              <li key={g.id}>
                <a className="hub__tile" href={g.href} aria-label={done ? `${g.name}, done today` : g.name}>
                  <img className="hub__icon" src={`/hub/${g.icon}.webp`} alt="" width={384} height={384} loading="lazy" />
                  <span className="hub__name display">{g.name}</span>
                  {done ? <span className="hub__done" aria-hidden>✓</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
