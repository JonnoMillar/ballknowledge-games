'use client';
import { useEffect, useState } from 'react';
import { Mark } from './Chain';
import type { BoardSummary } from '../src/lib/chain/client';
import { boardForDay, dateOfDay, dayNumber, localDate } from '../src/lib/daily';
import { readProgress, streakOf, type Progress } from '../src/lib/progress';
import { shareLine } from '../src/lib/chain/tier';

/**
 * The home page.
 *
 * One thing first: today's chain, or the result if it has been played.
 * Then the streak, the Deep Cuts track for anyone who wants a score, the
 * archive of past dailies, and how to play. Everything the page knows
 * about the player is in localStorage, read once on mount.
 */
export default function Home({ boards }: { boards: BoardSummary[] }) {
  const dailyIds = boards.filter((b) => b.completion).map((b) => b.id);
  const byId = new Map(boards.map((b) => [b.id, b]));
  const [today, setToday] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ plays: {} });

  useEffect(() => {
    setToday(dayNumber(localDate()));
    setProgress(readProgress());
  }, []);

  const todayId = today !== null ? boardForDay(today, dailyIds) : null;
  const todayBoard = todayId ? byId.get(todayId) : undefined;
  const todayPlay = todayId ? progress.plays[todayId] : undefined;
  const streak = today !== null ? streakOf(progress, today) : { current: 0, best: 0 };

  const deepCuts = boards.filter((b) => !b.completion && b.difficulty !== undefined || (!b.completion && b.closed));
  const archive = today !== null
    ? Array.from({ length: Math.min(today - 1, 30) }, (_, i) => today - 1 - i)
        .map((day) => ({ day, id: boardForDay(day, dailyIds)! }))
        .filter(({ id }) => byId.has(id))
    : [];

  const count = (n: number) => ['no', 'one', 'two', 'three', 'four', 'five'][n] ?? String(n);
  const givensLine = (b: BoardSummary) => {
    const g = b.givens;
    return g.length <= 1 ? g.join('') : `${g.slice(0, -1).join(', ')} and ${g[g.length - 1]}`;
  };

  return (
    <div className="app">
      <header className="masthead">
        <a className="masthead__brand display" href="/">
          <Mark className="masthead__mark" />
          Chain
        </a>
        <div className="masthead__meta">
          {streak.current > 0 ? <span className="pill">Streak {streak.current}</span> : null}
        </div>
      </header>

      <main className="home">
        <section className="hero">
          {today === null || !todayBoard ? (
            <p className="brief">Loading today’s chain…</p>
          ) : todayPlay ? (
            <>
              <p className="hero__eyebrow">Chain #{today} · {dateOfDay(today)}</p>
              <h1 className={`hero__head display ${todayPlay.held ? 'hero__head--held' : 'hero__head--broke'}`}>
                {todayPlay.held ? 'Chain held' : 'Chain broke'}
              </h1>
              <p className="hero__grid">{todayPlay.links.map((l) => (l ? '🟩' : '🟥')).join('')}</p>
              <p className="brief__note">
                {streak.current > 0 ? `Day ${streak.current} of your streak.` : 'Tomorrow is a new chain.'}
                {streak.best > streak.current ? ` Your best is ${streak.best}.` : ''}
              </p>
              <div className="hero__actions">
                <ShareButton text={shareLine({ title: `Chain #${today}`, links: todayPlay.links, tiers: [] })} />
                <a className="actions__link" href={`/play/${todayId}`}>Look at the board</a>
              </div>
            </>
          ) : (
            <>
              <p className="hero__eyebrow">Chain #{today} · {dateOfDay(today)}</p>
              <h1 className="hero__head display">
                {todayBoard.closed ? 'Close the ring' : 'Link the ends'}
              </h1>
              <p className="brief">
                <b>{givensLine(todayBoard)}</b>. {count(todayBoard.blanks)[0]!.toUpperCase() + count(todayBoard.blanks).slice(1)} to find, a clue on each.
              </p>
              <div className="hero__actions">
                <a className="seal seal--link" href={`/play/${todayId}`}>Play today’s chain</a>
              </div>
              {streak.current > 0 ? <p className="brief__note">Day {streak.current} of your streak. Keep it going.</p> : null}
            </>
          )}
        </section>

        <section className="how">
          <h2 className="home__head display">How it works</h2>
          <ol className="how__list">
            <li>Every link is a club two players both played for. The givens share nothing.</li>
            <li>Each empty sticker says who fits it, like “a German”. Tap it, name the player.</li>
            <li>Seal it once. The chain holds or it doesn’t, and the streak counts the days it held.</li>
          </ol>
        </section>

        {deepCuts.length > 0 ? (
          <section className="track">
            <h2 className="home__head display">Deep Cuts</h2>
            <p className="track__blurb">No clues, and a score for how far from the obvious you went. Name Messi and you’re a banker. Name the loanee and you’re a deep cut.</p>
            <ul className="board-list">
              {deepCuts.map((b) => {
                const play = progress.plays[b.id];
                return (
                  <li key={b.id}>
                    <a className="board-row" href={`/play/${b.id}`}>
                      <span className="board-row__id display">{b.id}</span>
                      <span className="board-row__name">{givensLine(b)}</span>
                      <span className="board-row__meta">
                        {play ? play.links.map((l) => (l ? '🟩' : '🟥')).join('') + (play.tiers.every((t) => t) ? ' ' + play.tiers.map((t) => (t === 'deep' ? '💎' : t === 'shout' ? '🔷' : '⚪')).join('') : '') : b.difficulty ? <span className="pill pill--ink">{b.difficulty}</span> : null}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {archive.length > 0 ? (
          <section className="track">
            <h2 className="home__head display">Past chains</h2>
            <ul className="board-list">
              {archive.map(({ day, id }) => {
                const b = byId.get(id)!;
                const play = progress.plays[id];
                return (
                  <li key={day}>
                    <a className="board-row" href={`/play/${id}`}>
                      <span className="board-row__id display">#{day}</span>
                      <span className="board-row__name">{givensLine(b)}</span>
                      <span className="board-row__meta">{play ? play.links.map((l) => (l ? '🟩' : '🟥')).join('') : <span className="board-row__todo">Not played</span>}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(text); setState('copied'); } catch { setState('failed'); }
    setTimeout(() => setState('idle'), 2200);
  }
  return <button type="button" className="seal" onClick={copy}>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Share'}</button>;
}
