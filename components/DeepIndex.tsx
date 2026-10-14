'use client';
import { useEffect, useState } from 'react';
import { Mark } from './Chain';
import BoardPreview from './BoardPreview';
import MastNav from './MastNav';
import { GradeChip } from './Slab';
import { shortClubName } from './ClubBadge';
import type { BoardSummary, Given } from '../src/lib/chain/client';
import { readProgress, type Progress } from '../src/lib/progress';
import { readCollection } from '../src/lib/collection';
import { GRADE_GLYPH, pageGrade } from '../src/lib/chain/grade';
import { MARK_GLYPH } from '../src/lib/chain/share';
import { plateName } from '../src/lib/short-name';
import Back from './Back';

/**
 * Deep Cuts: the open boards, where going deep is the point.
 *
 * Every board is two famous ends and a named club, with dozens of answers on
 * each side. Played boards show the page's grade; the rest are still to
 * find. Progress and cards are in localStorage, read once on mount.
 */
export default function DeepIndex({ boards }: { boards: BoardSummary[] }) {
  const [progress, setProgress] = useState<Progress>({ plays: {} });
  const [cards, setCards] = useState(0);
  useEffect(() => {
    setProgress(readProgress());
    setCards(Object.keys(readCollection()).length);
  }, []);
  const played = boards.filter((b) => progress.plays[b.id]).length;

  return (
    <div className="app">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/chain">
          <Mark className="masthead__mark" />
          Chain
        </a>
        <div className="masthead__meta">
          <MastNav />
        </div>
      </header>

      <main className="home">
        <section className="deep-intro">
          <h1 className="hero__head display">Deep Cuts</h1>
          <p className="brief deep-intro__brief">
            Wide-open boards with dozens of ways across. Anyone who links will hold, but the famous names only earn
            bronze. Dig for the players nobody else remembers and they come back in rarer cases, up to Elite:
            the deepest answer on the plate.
          </p>
          <p className="deep-intro__stats">
            {played} of {boards.length} played · <a href="/collection">{cards} {cards === 1 ? 'card' : 'cards'} collected</a>
          </p>
        </section>

        <ul className="ladder__list">
          {boards.map((b) => {
            const play = progress.plays[b.id];
            const grade = play?.grades ? pageGrade(play.grades) : null;
            return (
              <li key={b.id}>
                <a className={`page page--card ${play ? (play.held ? 'page--held' : 'page--broke') : ''}`} href={`/play/${b.id}`}>
                  <span className="page__tab page__tab--deep display">{b.id}</span>
                  {grade ? <span className="deep-card__grade"><GradeChip grade={grade} /></span> : null}
                  <BoardPreview board={b} links={play?.links ?? null} plates={false} />
                  <span className="page__foot">
                    <span className="page__name">{givensLine(b.slots)}{b.via ? ` via ${shortClubName(b.via)}` : ''}</span>
                    <span className="page__meta">
                      {play
                        ? <span className="grid">{(play.grades ?? []).map((g) => (g ? GRADE_GLYPH[g] : MARK_GLYPH.missed)).join('')}</span>
                        : 'Not played'}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

function givensLine(slots: readonly (Given | null)[]): string {
  const g = slots.flatMap((s) => (s ? [plateName(s.id, s.name)] : []));
  return g.join(' to ');
}
