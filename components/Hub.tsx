import type { CSSProperties } from 'react';
import { GAMES } from '../src/games';

/** The front door of the site: one card per game. Static, so no 'use client'. */
export default function Hub() {
  return (
    <div className="app">
      <header className="masthead">
        <span className="masthead__brand display">Football games</span>
      </header>
      <main className="home">
        <section className="also">
          {GAMES.map((g) => (
            <a key={g.href} className="also__card" href={g.href} style={{ '--accent': g.accent } as CSSProperties}>
              <span className="also__band display">{g.name}</span>
              <span className="also__copy"><b>{g.lead}</b> {g.blurb}</span>
              <span className="also__go">{g.cta}</span>
            </a>
          ))}
        </section>
      </main>
    </div>
  );
}
