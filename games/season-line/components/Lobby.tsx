'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import Back from '../../../components/Back';
import Words from '../../../components/Words';
import { dayNumber, localDate } from '../../../src/lib/daily';
import { seasonLabel } from '../lib/clubs';
import { EPOCH } from '../lib/day';
import { loadGuesses, loadRange, saveRange } from '../lib/progress';
import type { BoardView } from '../lib/types';
import How, { type Demo } from './How';

/** The working colour of its hub tile, until it has one. */
export const GROUND = '#1F5F57';

/**
 * The way in, on the front-page kit: today's daily on the game's ground
 * (the first fifth of today's line as the picture, and the one red button),
 * then How it goes and Endless. Once today is done the red moves to Endless.
 */
export default function Lobby({ years, demo }: { years: [number, number]; demo: Demo }) {
  const [today, setToday] = useState<BoardView | null>(null);
  const [me, setMe] = useState<{ date: string; started: boolean } | null>(null);
  const [range, setRange] = useState<[number, number]>([2000, years[1]]);
  useEffect(() => {
    const date = localDate();
    const guesses = loadGuesses(date);
    setMe({ date, started: guesses.length > 0 });
    const r = loadRange();
    if (r && r[0] >= years[0] && r[1] <= years[1] && r[0] <= r[1]) setRange(r);
    fetch('/api/season-line/board', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: date, guesses }) })
      .then((x) => (x.ok ? (x.json() as Promise<BoardView>) : null))
      .then(setToday, () => {});
  }, [years]);

  const done = today?.done ?? false;
  const n = me ? dayNumber(me.date, EPOCH) : null;
  const all = Array.from({ length: years[1] - years[0] + 1 }, (_, i) => years[0] + i);
  const set = (i: 0 | 1, v: number) => {
    const r: [number, number] = i === 0 ? [v, Math.max(v, range[1])] : [Math.min(v, range[0]), v];
    setRange(r);
    saveRange(r);
  };

  return (
    <div className="app sl">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/season-line">Season line</a>
      </header>
      <main className="lobby">
        <section className="lobby-hero lobby__wide" style={{ '--ground': GROUND } as CSSProperties}>
          <span className="lobby-hero__ground" style={{ viewTransitionName: 'game-season-line' }} aria-hidden />
          <div className="lobby-hero__ask">
            <span className="lobby-tag">Daily{n ? ` #${n}` : ''}</span>
            <h1 className="lobby-hero__head display"><Words text="Whose season was it?" /></h1>
            <p className="lobby-hero__sub">A Premier League club, week by week. Name the club and the season.</p>
          </div>
          <div className="lobby-hero__go sl-lobby__play">
            {me === null ? null : done && today ? (
              <p className="sl-lobby__result display">
                {today.won ? `Got it in ${today.judged.length}` : 'Missed it'} · {today.answer?.name} {today.answer ? seasonLabel(today.answer.start) : ''}
              </p>
            ) : (
              <a className="lobby-play" href="/season-line/play">{me.started ? 'Continue today’s daily' : 'Play today’s daily'}</a>
            )}
          </div>
          <div className="lobby-hero__go sl-endless" id="endless">
            <span className="lobby-tag lobby-tag--paper">Endless</span>
            <p className="sl-endless__head display">Pick your years</p>
            <div className="sl-endless__range">
              <select className="sl-select" aria-label="From" value={range[0]} onChange={(e) => set(0, Number(e.target.value))}>
                {all.map((y) => <option key={y} value={y}>{seasonLabel(y)}</option>)}
              </select>
              <span aria-hidden>to</span>
              <select className="sl-select" aria-label="To" value={range[1]} onChange={(e) => set(1, Number(e.target.value))}>
                {all.map((y) => <option key={y} value={y}>{seasonLabel(y)}</option>)}
              </select>
            </div>
            <a className={done ? 'lobby-play' : 'lobby-quiet'} href={`/season-line/play?from=${range[0]}&to=${range[1]}`}>Play endless</a>
          </div>
        </section>

        <How demo={demo} />
      </main>
    </div>
  );
}
