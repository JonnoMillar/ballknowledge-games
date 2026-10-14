'use client';
import { Fragment, useEffect, useState } from 'react';
import { Figure, StickerFace, solid } from '../../../components/Sticker';
import { shortClubName } from '../../../components/ClubBadge';
import { crestPath } from '../../../src/lib/clubs';
import { dayNumber, localDate } from '../../../src/lib/daily';
import type { PlateMark } from '../../../src/lib/chain/share';
import { marksOf, pastDays } from './Archive';
import { ItkMark } from './Itk';
import { Loop } from './Trail';
import { ResultSticker } from './Reveal';
import { pointsOf, tierOf } from '../lib/score';
import { allPlayed, type Played } from '../lib/progress';
import type { ItkDay, ItkStop } from '../lib/types';
import type { DemoCareer } from '../server';

/**
 * The way in. Three cards on the album page:
 *
 * - Today's daily, across the top: the question on the left; on the right
 *   the player you play next, five marks for the day, and the one red button.
 *   Once the day is done: your card and the time to the next one, no red.
 * - An example, bottom left: Ronaldo, three clubs, the marker circles the
 *   fake and it peels back to the real one.
 * - The archive, bottom right: how many past dailies you have not finished.
 */
export default function Lobby({ epoch, demo }: { epoch: string; demo: DemoCareer }) {
  // Read after mount: localStorage is the player's, and the server render knows nothing of it.
  const [me, setMe] = useState<{ today: string; played: Record<string, Played> } | null>(null);
  useEffect(() => setMe({ today: localDate(), played: allPlayed() }), []);

  // Today's careers, for the face of the player you play next.
  const [day, setDay] = useState<ItkDay | null>(null);
  useEffect(() => {
    if (!me) return;
    fetch(`/api/spoofed/day?date=${me.today}`)
      .then((r) => (r.ok ? (r.json() as Promise<ItkDay>) : null))
      .then(setDay, () => {});
  }, [me]);

  const marks = me ? marksOf(me.played[me.today]) : [];
  const started = marks.some(Boolean);
  const done = marks.length > 0 && marks.every(Boolean);
  const next = marks.findIndex((m) => !m);
  const n = me ? dayNumber(me.today, epoch) : null;
  const waiting = me ? pastDays(me.today, epoch).filter((d) => !marksOf(me.played[d]).every(Boolean)).length : null;

  return (
    <div className="app itk">
      <header className="masthead">
        <a className="masthead__brand display" href="/spoofed">
          <ItkMark />
          Spoofed
        </a>
        <nav className="masthead__nav" aria-label="Site">
          <a className="masthead__button" href="/">All games</a>
        </nav>
      </header>
      <main className="itk__main itk-lobbies">
        <section className="itk-lobby itk-lobby--today">
          <div className="itk-stage__tab itk-stage__tab--hard display">Daily{n ? ` #${n}` : ''}</div>
          <div className="itk-lobby__ask">
            <h1 className="itk-lobby__headline display">Can you spot the spoof?</h1>
            <p className="itk-lobby__sub">One of these moves never happened.</p>
          </div>
          <div className="itk-lobby__go">
            {me === null ? null : done ? (
              <>
                <a className="itk-lobby__result" href="/spoofed/play" aria-label="Today's result">
                  <ResultSticker rung={tierOf(marks as PlateMark[])} points={pointsOf(marks as PlateMark[])} />
                </a>
                <Marks marks={marks} />
                <Countdown />
              </>
            ) : (
              <>
                <div className="itk-lobby__who">
                  {day?.rounds[next] ? (
                    <StickerFace player={day.rounds[next]!.player} image={day.rounds[next]!.image ?? undefined} ground={solid(day.rounds[next]!.ground)} />
                  ) : (
                    <div className="sticker sticker--empty">
                      <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
                      <span className="sticker__plate"><span className="sticker__no">{next + 1}</span></span>
                    </div>
                  )}
                </div>
                <Marks marks={marks} />
                <a className="itk-lobby__play display" href="/spoofed/play">
                  {started ? 'Continue today’s daily' : 'Play today’s daily'}
                </a>
              </>
            )}
          </div>
        </section>

        <section className="itk-lobby itk-lobby--demo" aria-label="An example">
          <span className="itk-lobby__eyebrow">Example</span>
          <Demo demo={demo} />
        </section>

        <a className="itk-lobby itk-lobby--archive" href="/spoofed/archive">
          <ArchiveIcon />
          <span className="itk-lobby__archtext">
            <span className="itk-lobby__archtitle display">Archive</span>
            <span className="itk-lobby__archline">
              {waiting === null ? ' ' : waiting ? `${waiting} past ${waiting === 1 ? 'daily' : 'dailies'} still to play` : 'Every past daily played'}
              <svg className="itk-lobby__arrow" viewBox="0 0 20 12" aria-hidden><path d="M1 6h17M13 1.5 18 6l-5 4.5" /></svg>
            </span>
          </span>
        </a>
      </main>
    </div>
  );
}

/** The day's five careers: done ones carry their mark, the rest wait. */
function Marks({ marks }: { marks: (PlateMark | null)[] }) {
  return (
    <span className="itk-lobby__marks" aria-hidden>
      {marks.map((m, i) => <span key={i} className={`itk-pip itk-pip--${m ?? 'open'}`} />)}
    </span>
  );
}

/** Time to the next day, on the player's own clock. */
function Countdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.ceil((midnight.getTime() - now.getTime()) / 60_000);
  return <p className="itk-lobby__next">Next in {Math.floor(mins / 60)}h {mins % 60}m</p>;
}

/** Album pages, stacked: the days gone by. */
function ArchiveIcon() {
  return (
    <svg className="itk-lobby__icon" viewBox="0 0 64 64" aria-hidden>
      <rect x="18" y="6" width="34" height="42" rx="3" transform="rotate(8 35 27)" />
      <rect x="12" y="10" width="34" height="42" rx="3" transform="rotate(-4 29 31)" />
      <rect x="15" y="14" width="34" height="42" rx="3" className="itk-lobby__icontop" />
      <path d="M21 22h22M21 28h22M21 34h22M21 40h14" className="itk-lobby__iconrules" />
    </svg>
  );
}

/**
 * What you do, with no instructions: three clubs from a career everyone
 * knows. The marker circles the fake, it peels off, the real club is
 * underneath. CSS only, a 7 s loop; reduced motion shows the last frame.
 */
function Face({ stop, clubId, name }: { stop: ItkStop; clubId: string; name: string }) {
  return (
    <span className="itk-demo__face">
      <span className="itk-demo__year display">{stop.year}</span>
      <img className="itk-demo__crest" src={crestPath(clubId)} alt="" draggable={false} />
      <span className="itk-demo__name display">{shortClubName(name)}</span>
    </span>
  );
}

function Demo({ demo }: { demo: DemoCareer }) {
  const { round, fake, real } = demo;
  return (
    <div className="itk-demo" aria-hidden>
      <div className="itk-demo__who">
        <StickerFace player={round.player} image={round.image ?? undefined} ground={solid(round.ground)} className="sticker--still" />
      </div>
      <div className="itk-demo__trail">
        {round.stops.map((s, i) => (
          <Fragment key={i}>
            {i ? <span className={`itk-demo__leg ${i === fake || i === fake + 1 ? 'is-mended' : ''}`} /> : null}
            {i === fake ? (
              <span className="itk-demo__card is-fake">
                <Face stop={s} clubId={real.clubId} name={real.name} />
                <span className="itk-demo__peel"><Face stop={s} clubId={s.clubId} name={s.name} /></span>
                <Loop className="itk-demo__loop" />
              </span>
            ) : (
              <span className="itk-demo__card"><Face stop={s} clubId={s.clubId} name={s.name} /></span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
