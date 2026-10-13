'use client';
import { Fragment, useEffect, useState } from 'react';
import { Figure, StickerFace, solid } from '../../../components/Sticker';
import { dayNumber, localDate } from '../../../src/lib/daily';
import type { PlateMark } from '../../../src/lib/chain/share';
import Archive, { marksOf, pastDays, playUrl } from './Archive';
import { ItkMark } from './Itk';
import { Loop } from './Trail';
import { ResultSticker } from './Reveal';
import { pointsOf, tierOf } from '../lib/score';
import { allPlayed, type Played } from '../lib/progress';
import type { ItkDay } from '../lib/types';

/**
 * The way in. One page of the album with one red button on it.
 *
 * Never played: what the game is, shown rather than told (a looping demo),
 * and Play. Today not started: five empty slots and Play. Part played: the
 * careers you have done stuck in their slots, and Continue. Done: your
 * card, the five, the time to the next day, and the newest day you have not
 * finished as the one thing left to do. The archive sits below.
 */
export default function Lobby({ epoch }: { epoch: string }) {
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
            <div className="itk-stage__tab itk-stage__tab--hard display">#{n}</div>
            <h1 className="itk-lobby__headline display">One move never happened</h1>
            <Demo />
            <a className="itk-lobby__play display" href="/spoofed/play">Play</a>
          </section>
        ) : done ? (
          <section className="itk-lobby itk-lobby--done">
            <div className="itk-stage__tab itk-stage__tab--hard display">#{n}</div>
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
            <div className="itk-stage__tab itk-stage__tab--hard display">#{n}</div>
            <Slots day={day} marks={marks} />
            <a className="itk-lobby__play display" href="/spoofed/play">{started ? 'Continue' : 'Play'}</a>
          </section>
        )}

        {past.length ? (
          <section className="itk-lobby__archive">
            <h2 className="itk-lobby__head display">Archive</h2>
            <Archive days={past} today={me!.today} epoch={epoch} played={me!.played} />
          </section>
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
 * What you do, with no words: a career of made-up crests, the marker circles
 * one, it peels off and the real one is underneath. Invented clubs, so it
 * spoils no day. CSS only, a 7 s loop; reduced motion shows the last frame.
 */
const CRESTS = [
  { year: 2012, crest: 'halves', a: '#1F4E9C', b: '#F2F0EA' },
  { year: 2015, crest: 'stripes', a: '#C8202F', b: '#F2F0EA' },
  { year: 2017, crest: 'sash', a: '#F2C318', b: '#1B1B1B' },
  { year: 2020, crest: 'hoop', a: '#6CABDD', b: '#F2F0EA' },
];
const REAL = { crest: 'halves', a: '#7A263A', b: '#9BC3E6' };

function Face({ year, crest, a, b }: { year: number; crest: string; a: string; b: string }) {
  return (
    <span className="itk-demo__face">
      <span className="itk-demo__year display">{year}</span>
      <span className={`itk-demo__crest itk-demo__crest--${crest}`} style={{ ['--a' as string]: a, ['--b' as string]: b }} />
      <span className="itk-demo__name" />
    </span>
  );
}

function Demo() {
  return (
    <div className="itk-demo" aria-hidden>
      {CRESTS.map((c, i) => (
        <Fragment key={i}>
          {i ? <span className={`itk-demo__leg ${i === 2 || i === 3 ? 'is-mended' : ''}`} /> : null}
          {i === 2 ? (
            <span className="itk-demo__card is-fake">
              <Face {...REAL} year={c.year} />
              <span className="itk-demo__peel"><Face {...c} /></span>
              <Loop className="itk-demo__loop" />
            </span>
          ) : (
            <span className="itk-demo__card"><Face {...c} /></span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
