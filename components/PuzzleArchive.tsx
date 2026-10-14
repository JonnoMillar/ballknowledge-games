'use client';
import { useEffect, useState } from 'react';
import { Mark } from './Chain';
import BoardPreview from './BoardPreview';
import MastNav from './MastNav';
import Back from './Back';
import type { BoardSummary, Given } from '../src/lib/chain/client';
import { boardForDay, dateOfDay, dayNumber, localDate, shortDate } from '../src/lib/daily';
import { readProgress, type Play, type Progress } from '../src/lib/progress';
import { MARK_GLYPH } from '../src/lib/chain/share';
import { plateName } from '../src/lib/short-name';

/**
 * The puzzle's archive: every daily gone by, newest first, then the ladder
 * of harder boards for anyone who wants one. Reached from Chain's hub.
 */
export default function PuzzleArchive({ boards }: { boards: BoardSummary[] }) {
  const dailyIds = boards.filter((b) => b.daily).map((b) => b.id);
  const byId = new Map(boards.map((b) => [b.id, b]));
  const [today, setToday] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ plays: {} });
  useEffect(() => {
    setToday(dayNumber(localDate()));
    setProgress(readProgress());
  }, []);

  const ladder = boards.filter((b) => !b.daily && !b.deep);
  const past = pastPuzzles(today, dailyIds).filter(({ id }) => byId.has(id));

  return (
    <div className="app">
      <header className="masthead">
        <Back href="/chain" label="Chain" />
        <a className="masthead__brand display" href="/chain">
          <Mark className="masthead__mark" />
          Chain
        </a>
        <div className="masthead__meta">
          <span>Puzzle archive</span>
          <MastNav />
        </div>
      </header>

      <main className="home">
        {past.length > 0 ? (
          <section className="archive">
            <h1 className="home__head display">Past puzzles</h1>
            <ul className="daytiles">
              {past.map(({ day, id }) => {
                const b = byId.get(id)!;
                const play = progress.plays[id];
                return (
                  <li key={day}>
                    <a className={`daytile ${play ? 'is-done' : ''}`} href={`/play/${id}`} title={givensLine(b.slots)}>
                      <span className="daytile__n display">#{day}</span>
                      <span className="daytile__date">{shortDate(dateOfDay(day))}</span>
                      <span className="daytile__strip" aria-hidden>
                        {b.slots.flatMap((s) => (s ? [<i key={s.id} style={{ background: s.ground }} />] : []))}
                      </span>
                      <span className="daytile__note">{play ? <Grid play={play} /> : 'Play'}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {ladder.length > 0 ? (
          <section className="ladder">
            <h2 className="home__head display">The ladder</h2>
            <p className="track__blurb">Harder boards, no single answer: anyone who fits will do.</p>
            <ul className="ladder__list">
              {ladder.map((b) => {
                const play = progress.plays[b.id];
                const label = b.closed ? 'The ring' : b.difficulty ? b.difficulty[0]!.toUpperCase() + b.difficulty.slice(1) : 'Open';
                return (
                  <li key={b.id}>
                    <a className={`page page--card ${play ? (play.held ? 'page--held' : 'page--broke') : ''}`} href={`/play/${b.id}`}>
                      <span className={`page__tab page__tab--${b.closed ? 'ring' : b.difficulty ?? 'ring'} display`}>{label}</span>
                      <BoardPreview board={b} links={play?.links ?? null} plates={false} />
                      <span className="page__foot">
                        <span className="page__name">{givensLine(b.slots)}</span>
                        <span className="page__meta">{play ? <Grid play={play} /> : `${b.slots.filter((s) => !s).length} to find`}</span>
                      </span>
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

/** Every daily before today, newest first. */
export function pastPuzzles(today: number | null, dailyIds: string[]): { day: number; id: string }[] {
  if (today === null) return [];
  return Array.from({ length: today - 1 }, (_, i) => today - 1 - i)
    .flatMap((day) => {
      const id = boardForDay(day, dailyIds);
      return id ? [{ day, id }] : [];
    });
}

/** The result as glyphs, the same ones the share line uses. */
export function Grid({ play }: { play: Play }) {
  return <span className="grid">{(play.plates ?? []).map((m) => MARK_GLYPH[m]).join('')}</span>;
}

export function givensLine(slots: readonly (Given | null)[]): string {
  const g = slots.flatMap((s) => (s ? [plateName(s.id, s.name)] : []));
  return g.length <= 1 ? g.join('') : `${g.slice(0, -1).join(', ')} and ${g[g.length - 1]}`;
}
