'use client';
import { useEffect, useState } from 'react';
import { StickerFace, solid } from '../../../components/Sticker';
import { shortClubName } from '../../../components/ClubBadge';
import { localDate } from '../../../src/lib/daily';
import type { PlateMark } from '../../../src/lib/chain/share';
import Trail, { Loop } from './Trail';
import { AlbumReveal } from './Reveal';
import type { ItkDay, Verdict } from '../lib/types';
import { PICKS, itkShareLine, roundMark, tierOf } from '../lib/score';
import { loadPlayed, savePlayed, type Played } from '../lib/progress';

/**
 * Spoofed: five careers, one move in each that never happened. Circle it.
 *
 * Today is the player's own date. Picks are judged by /api/spoofed/pick; the page
 * never knows where the fake is until the round is over. Progress is kept in
 * this browser, so a reload resumes and a finished day stays finished.
 */
const VERDICT: Record<PlateMark, string> = { held: 'Clocked it', hinted: 'Got there', missed: 'Had you' };
/** The beat between circling a club and hearing about it. */
const BEAT = 520;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Itk() {
  const [day, setDay] = useState<ItkDay | null | undefined>(undefined);
  useEffect(() => {
    fetch(`/api/spoofed/day?date=${localDate()}`)
      .then((r) => (r.ok ? (r.json() as Promise<ItkDay>) : null))
      .then(setDay, () => setDay(null));
  }, []);

  return (
    <div className="app itk">
      <header className="masthead">
        <a className="masthead__brand display" href="/spoofed">
          <ItkMark />
          Spoofed
        </a>
        <div className="masthead__meta">
          {day ? <span>#{day.day}</span> : null}
          <nav className="masthead__nav" aria-label="Site">
            <a className="masthead__button" href="/">All games</a>
          </nav>
        </div>
      </header>
      <main className="itk__main">
        {day === undefined ? null : day === null ? (
          <p className="itk-status__hint itk__none">No careers today. Back tomorrow.</p>
        ) : (
          <Game key={day.date} day={day} />
        )}
      </main>
    </div>
  );
}

function Game({ day }: { day: ItkDay }) {
  const n = day.rounds.length;
  const [played, setPlayed] = useState<Played>(() => loadPlayed(day.date, n));
  const marks = played.picks.map((p) => roundMark(p.map((x) => x.fake)));
  const done = marks.every(Boolean);
  const open = marks.findIndex((m) => !m);
  const round = open === -1 ? n - 1 : open;
  const [view, setView] = useState(round);
  // Coming back to a finished day goes straight to the result.
  const [finished, setFinished] = useState(done);
  const [pending, setPending] = useState<number | null>(null);

  const r = day.rounds[view]!;
  const mark = marks[view];
  const viewPicks = played.picks[view]!;

  async function pick(index: number) {
    if (pending !== null || mark || viewPicks.some((p) => p.index === index)) return;
    setPending(index);
    const last = viewPicks.length + 1 >= PICKS;
    const res = await Promise.all([
      fetch('/api/spoofed/pick', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: day.date, round: view, index, last }),
      }).then((x) => (x.ok ? (x.json() as Promise<Verdict>) : null)),
      sleep(BEAT),
    ]).then(([v]) => v, () => null);
    // A pick that was never judged is not spent: let go of the card and let them try again.
    if (!res) { setPending(null); return; }
    const at = <T,>(xs: T[], v: T) => xs.map((x, i) => (i === view ? v : x));
    const next: Played = {
      picks: at(played.picks, [...viewPicks, { index, fake: res.fake }]),
      fakes: res.fakeIndex !== null ? at(played.fakes, res.fakeIndex) : played.fakes,
      reals: res.fakeIndex !== null ? at(played.reals, res.real) : played.reals,
    };
    setPlayed(next);
    savePlayed(day.date, next);
    setPending(null);
  }

  function next() {
    if (done) setFinished(true);
    else setView(round);
  }

  if (finished && done) {
    return <Summary day={day} marks={marks as PlateMark[]} onReview={(i) => { setFinished(false); setView(i); }} />;
  }

  return (
    <>
      <div className="itk__bar">
        <ol className="itk-pips" aria-label="Careers">
          {day.rounds.map((_, i) => (
            <li key={i}>
              <button
                type="button"
                className={`itk-pip ${marks[i] ? `itk-pip--${marks[i]}` : ''} ${i === view ? 'is-current' : ''}`}
                disabled={i > round}
                onClick={() => setView(i)}
                aria-label={`Career ${i + 1}${marks[i] ? `, ${VERDICT[marks[i]!].toLowerCase()}` : ''}`}
                aria-current={i === view ? 'step' : undefined}
              />
            </li>
          ))}
        </ol>
        <span className="itk-picks" aria-label={`${PICKS - viewPicks.length} of ${PICKS} picks left`}>
          {Array.from({ length: PICKS }, (_, i) => (
            <Loop key={i} className={`itk-picks__loop ${i < viewPicks.length ? 'is-used' : ''}`} />
          ))}
        </span>
      </div>

      <section className="itk-stage" key={view}>
        <div className={`itk-stage__tab itk-stage__tab--${view < 2 ? 'easy' : view < 4 ? 'medium' : 'hard'} display`}>
          Career {view + 1}
        </div>
        <div className={`itk-stage__who ${mark ? `is-${mark}` : ''}`}>
          <StickerFace player={r.player} image={r.image ?? undefined} ground={solid(r.ground)} className="sticker--still" />
        </div>
        <Trail
          stops={r.stops}
          picks={viewPicks}
          fakeIndex={played.fakes[view] ?? null}
          real={played.reals[view] ?? null}
          pending={pending}
          locked={Boolean(mark)}
          onPick={pick}
        />
      </section>

      <div className="itk-status" aria-live="polite">
        {mark ? (
          <>
            <span className={`itk-status__chip itk-status__chip--${mark}`} aria-hidden />
            <span className="itk-status__verdict display">{VERDICT[mark]}</span>
            {mark === 'missed' && played.fakes[view] != null ? (
              <span className="itk-status__note">
                It was {shortClubName(r.stops[played.fakes[view]!]!.name)}{played.reals[view] ? `, really ${shortClubName(played.reals[view]!.name)}` : ', a move that never happened'}
              </span>
            ) : null}
            <button type="button" className="seal itk-status__next" onClick={next}>
              {done ? 'Your result' : view === round - 1 ? 'Next' : 'Back'}
            </button>
          </>
        ) : (
          <span className="itk-status__hint">
            {viewPicks.length === 0 ? 'One of these moves never happened.' : 'Real move. One pick left.'}
          </span>
        )}
      </div>
    </>
  );
}

/** The day's result: the tally, your card, the share line, then every result. */
function Summary({ day, marks, onReview }: { day: ItkDay; marks: PlateMark[]; onReview: (i: number) => void }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    await navigator.clipboard?.writeText(itkShareLine(day.day, marks)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <section className="itk-end">
      <div className="itk-end__reveal">
        <AlbumReveal
          rounds={day.rounds}
          marks={marks}
          rung={tierOf(marks)}
          day={day.day}
          onReview={onReview}
          actions={<button type="button" className="seal" onClick={share}>{copied ? 'Copied' : 'Share'}</button>}
        />
      </div>
    </section>
  );
}

/** The mark: a marker loop round a sticker. */
function ItkMark() {
  return (
    <svg className="masthead__mark" viewBox="0 0 26 32" aria-hidden>
      <rect x="6.5" y="8.5" width="13" height="16" rx="1" fill="currentColor" />
      <path
        d="M5 9.5 C9 3.5 21 3 23.6 10.5 C26 17.5 23 28.5 13.4 29.2 C4.5 29.8 1.2 22 2.2 15.4 C2.8 11.4 6.5 7.2 14.5 6.6"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      />
    </svg>
  );
}
