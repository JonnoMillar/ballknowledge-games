'use client';
import { useEffect, useState } from 'react';
import { Figure, StickerFace, solid } from '../../../components/Sticker';
import { shortClubName } from '../../../components/ClubBadge';
import { crestPath } from '../../../src/lib/clubs';
import { dayNumber, localDate } from '../../../src/lib/daily';
import type { PlateMark } from '../../../src/lib/chain/share';
import Archive, { marksOf, pastDays, playUrl } from './Archive';
import { ItkMark } from './Itk';
import { Loop } from './Trail';
import { ResultSticker } from './Reveal';
import { pointsOf, tierOf } from '../lib/score';
import { allPlayed, type Played } from '../lib/progress';
import type { ItkDay, ItkStop } from '../lib/types';
import type { DemoCareer } from '../server';

/**
 * The way in: today's daily, on one album page with one red button.
 *
 * Never played: the question, a looping demo on a career everyone knows,
 * and Play. Today not started: five empty slots and Play. Part played: the
 * careers you have done stuck in their slots, and Continue. Done: your card,
 * the five, the time to the next day, and the newest day you have not
 * finished. Past days wait behind the Archive button.
 */
export default function Lobby({ epoch, demo }: { epoch: string; demo: DemoCareer }) {
  // Read after mount: localStorage is the player's, and the server render knows nothing of it.
  const [me, setMe] = useState<{ today: string; played: Record<string, Played> } | null>(null);
  useEffect(() => setMe({ today: localDate(), played: allPlayed() }), []);

  const today = me?.today;
  const marks = me ? marksOf(me.played[today!]) : [];
  const started = marks.some(Boolean);
  const done = marks.length > 0 && marks.every(Boolean);
  const fresh = me !== null && !Object.values(me.played).some((p) => p.picks.some((x) => x.length));

  // The players only matter once one is stuck in: fetch the day then, not before.
  const [day, setDay] = useState<ItkDay | null>(null);
  useEffect(() => {
    if (!today || !started) return;
    fetch(`/api/spoofed/day?date=${today}`)
      .then((r) => (r.ok ? (r.json() as Promise<ItkDay>) : null))
      .then(setDay, () => {});
  }, [today, started]);

  const past = me ? pastDays(me.today, epoch) : [];
  const n = today ? dayNumber(today, epoch) : 0;
  const unfinished = me ? past.find((d) => !marksOf(me.played[d]).every(Boolean)) : undefined;
  const tab = <div className="itk-stage__tab itk-stage__tab--hard display">Daily #{n}</div>;

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
      <main className="itk__main">
        {me === null ? (
          <section className="itk-lobby itk-lobby--wait" aria-hidden />
        ) : fresh ? (
          <section className="itk-lobby itk-lobby--hero">
            {tab}
            <div className="itk-lobby__ask">
              <h1 className="itk-lobby__headline display">Can you spot the spoof?</h1>
              <p className="itk-lobby__sub">One of these moves never happened.</p>
            </div>
            <Demo demo={demo} />
            <a className="itk-lobby__play display" href="/spoofed/play">Play today&apos;s daily</a>
          </section>
        ) : done ? (
          <section className="itk-lobby itk-lobby--done">
            {tab}
            <a className="itk-lobby__result" href="/spoofed/play" aria-label="Today's result">
              <ResultSticker rung={tierOf(marks as PlateMark[])} points={pointsOf(marks as PlateMark[])} />
            </a>
            <div className="itk-lobby__side">
              <Slots day={day} marks={marks} />
              <Countdown />
              {unfinished ? (
                <a className="itk-lobby__play display" href={playUrl(unfinished, me.today)}>Play #{dayNumber(unfinished, epoch)}</a>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="itk-lobby">
            {tab}
            <Slots day={day} marks={marks} />
            <a className="itk-lobby__play display" href="/spoofed/play">
              {started ? 'Continue today’s daily' : 'Play today’s daily'}
            </a>
          </section>
        )}

        {past.length ? (
          <details className="itk-lobby__archive">
            <summary className="itk-lobby__more display">Archive</summary>
            <Archive days={past} today={me!.today} epoch={epoch} played={me!.played} />
          </details>
        ) : null}
      </main>
    </div>
  );
}

/** Today's five slots: a career you have finished is stuck in with its mark; the rest wait empty. */
function Slots({ day, marks }: { day: ItkDay | null; marks: (PlateMark | null)[] }) {
  return (
    <ol className="itk-lobby__slots" aria-label="Today's careers">
      {marks.map((m, i) => {
        const r = m ? day?.rounds[i] : undefined;
        return (
          <li key={i}>
            {r ? (
              <StickerFace player={r.player} image={r.image ?? undefined} ground={solid(r.ground)} />
            ) : (
              <div className="sticker sticker--empty">
                <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
                <span className="sticker__plate"><span className="sticker__no">{i + 1}</span></span>
              </div>
            )}
            <span className={`itk-pip itk-pip--${m ?? 'open'}`} aria-hidden />
          </li>
        );
      })}
    </ol>
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

/**
 * What you do, with no instructions: a career everyone knows, laid out as
 * the game lays it out (three a row, snaking back). The marker circles the
 * fake, it peels off, the real club is underneath. CSS only, a 7 s loop;
 * reduced motion shows the last frame.
 */
const SPOTS = [
  { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 },
  { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
];
// Card centres as a share of the board, for the route behind the cards.
const X = [12.67, 50, 87.33];
const Y = [25, 75];

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
      <div className="itk-demo__board">
        <svg className="itk-demo__route">
          {SPOTS.slice(0, -1).map((a, i) => {
            const b = SPOTS[i + 1]!;
            return (
              <line
                key={i}
                className={i === fake - 1 || i === fake ? 'is-mended' : ''}
                x1={`${X[a.col - 1]}%`} y1={`${Y[a.row - 1]}%`} x2={`${X[b.col - 1]}%`} y2={`${Y[b.row - 1]}%`}
              />
            );
          })}
        </svg>
        {round.stops.map((s, i) => (
          <span key={i} className={`itk-demo__card ${i === fake ? 'is-fake' : ''}`} style={{ gridColumn: SPOTS[i]!.col, gridRow: SPOTS[i]!.row }}>
            {i === fake ? (
              <>
                <Face stop={s} clubId={real.clubId} name={real.name} />
                <span className="itk-demo__peel"><Face stop={s} clubId={s.clubId} name={s.name} /></span>
                <Loop className="itk-demo__loop" />
              </>
            ) : <Face stop={s} clubId={s.clubId} name={s.name} />}
          </span>
        ))}
      </div>
    </div>
  );
}
