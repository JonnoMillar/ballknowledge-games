'use client';
import { useEffect, useState } from 'react';
import Pitch from './Pitch';
import FullTime from './FullTime';
import { dateOfDay, dayNumber, localDate, longDate } from '../../../src/lib/daily';
import { PIN_EPOCH } from '../lib/boards';
import { readStore, recordThrow, streakOf, type Throw } from '../lib/progress';
import { points, ring, RING_NAME, tally, type Mode } from '../lib/score';
import type { Spot } from '../lib/pitch';
import type { Answer, BoardView, GoalCard as Card } from '../lib/types';

/**
 * A Pitch pin board: six goals, one throw each. The page holds no answers;
 * each throw goes to /api/pin/throw and the answer comes back for that goal
 * alone. Progress is kept in the browser so a refresh resumes.
 */
export default function PitchPin({ board, mode, packs }: { board: BoardView; mode: Mode; packs: { id: string; title: string }[] }) {
  const n = board.goals.length;
  const [throws, setThrows] = useState<(Throw | null)[]>(() => Array<Throw | null>(n).fill(null));
  const [loaded, setLoaded] = useState(false);
  const [pin, setPin] = useState<Spot | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const store = readStore();
    const saved = store[board.id]?.throws;
    if (saved && saved.length === n) setThrows(saved);
    setStreak(streakOf(store, localDate()));
    setLoaded(true);
  }, [board.id, n]);

  const next = throws.findIndex((t) => !t);
  const done = next === -1 && viewing === null;
  const current = viewing ?? Math.max(next, 0);
  const goal = board.goals[current]!;
  const query = mode === 'points' ? '?score=points' : '';

  async function throwPin() {
    if (!pin || busy || next === -1) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch('/api/pin/throw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ board: board.id, goal: board.goals[next]!.slug, x: pin.x, y: pin.y }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const answer = (await res.json()) as Answer;
      const store = recordThrow(board.id, n, next, { pin, answer }, localDate());
      setThrows(store[board.id]!.throws);
      setStreak(streakOf(store, localDate()));
      setViewing(next);
      setPin(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const shown = viewing !== null ? throws[viewing] : null;
  const credits = [...new Set(board.goals.map((g) => g.credit))]
    .map((c) => (c === 'statsbomb' ? 'StatsBomb open data' : 'Understat'))
    .join(' and ');
  const pointsSoFar = tally(throws.filter((t): t is Throw => !!t).map((t) => t.answer.distance)).points;

  return (
    <div className="app pin">
      <header className="masthead">
        <a className="masthead__brand display" href={`/pin${query}`}>
          <PinLogo />
          Pitch pin
        </a>
        <div className="masthead__meta"><span>{board.title}</span></div>
      </header>

      <main className="pin__main">
        {!loaded ? null : done ? (
          <FullTime board={board} throws={throws as Throw[]} mode={mode} streak={board.date ? streak : null} />
        ) : (
          <>
            <Ticks n={n} thrown={throws.filter(Boolean).length} current={current} />
            <GoalCard goal={goal} small={shown !== null} />
            {shown ? (
              <>
                <Pitch label={`Your pin, ${shown.answer.distance.toFixed(1)} metres from where it was struck`} reveal={{ pin: shown.pin, at: shown.answer.at }} />
                <Result
                  t={shown}
                  goal={goal}
                  mode={mode}
                  pointsSoFar={pointsSoFar}
                  last={next === -1}
                  onNext={() => setViewing(null)}
                />
              </>
            ) : (
              <>
                <Pitch label="The attacking half of a pitch, goal at the top. Place your pin." pin={pin} onPin={setPin} onEnter={throwPin} />
                <p className="pin__hint">Where was it struck from? Tap the pitch, drag to adjust.</p>
                {failed ? <p className="pin__error" role="alert">Could not reach the ref. Try again.</p> : null}
                <button type="button" className="pin__throw display" disabled={!pin || busy} onClick={throwPin}>Throw</button>
              </>
            )}
          </>
        )}
        <More board={board} packs={packs} query={query} />
        <p className="pin__credit">Shot data: {credits}. Metres on a standard pitch.</p>
      </main>
    </div>
  );
}

function PinLogo() {
  return (
    <svg className="masthead__mark masthead__mark--pin" viewBox="0 0 22 30" aria-hidden>
      <circle cx="11" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="11" cy="10" r="3.2" fill="currentColor" />
      <line x1="11" y1="18.5" x2="11" y2="29" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function Ticks({ n, thrown, current }: { n: number; thrown: number; current: number }) {
  return (
    <div className="pin__ticks">
      <span>Goal {current + 1} of {n}</span>
      <ol aria-hidden>
        {Array.from({ length: n }, (_, i) => (
          <li key={i} className={`pin__tick${i === current ? ' pin__tick--current' : i < thrown ? ' pin__tick--done' : ''}`} />
        ))}
      </ol>
    </div>
  );
}

function GoalCard({ goal, small }: { goal: Card; small: boolean }) {
  return (
    <section className={`pin__card${small ? ' pin__card--small' : ''}`}>
      {small ? null : <span className="pin__comp">{goal.competition}</span>}
      <h1 className="pin__scorer display">{goal.scorer}</h1>
      <span className="pin__match">{goal.match}, {longDate(goal.date)}</span>
      {small ? null : <p className="pin__line">{goal.line}</p>}
    </section>
  );
}

const xgText = (a: Answer) =>
  `${a.credit === 'statsbomb' ? 'StatsBomb' : 'Understat'} gave it ${a.xg < 0.01 ? 'under a 1%' : `a ${Math.round(a.xg * 100)}%`} chance.`;

const watchUrl = (g: Card) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${g.scorer} goal ${g.match} ${g.date.slice(0, 4)}`)}`;

function Result({ t, goal, mode, pointsSoFar, last, onNext }: {
  t: Throw; goal: Card; mode: Mode; pointsSoFar: number; last: boolean; onNext: () => void;
}) {
  const d = t.answer.distance;
  const r = ring(d);
  return (
    <section className="pin__result" aria-live="polite">
      <div className="pin__score">
        {mode === 'points' ? (
          <>
            <span className="pin__big display">+{points(d)}</span>
            <span className="pin__sofar"><span>So far</span><b className="display">{pointsSoFar}</b></span>
          </>
        ) : (
          <>
            <span className="pin__big display">{d.toFixed(1)} m</span>
            <span className={`pin__ring pin__ring--${r} display`}>{RING_NAME[r]}</span>
          </>
        )}
      </div>
      <p className="pin__fact">
        {mode === 'points' ? `${d.toFixed(1)} m off. ` : ''}Struck {t.answer.at.y.toFixed(1)} m out. {xgText(t.answer)}
      </p>
      {t.answer.mirrored !== null ? (
        <p className="pin__mirror">Wrong side? Mirrored, you were {t.answer.mirrored.toFixed(1)} m off.</p>
      ) : null}
      <div className="pin__actions">
        <a className="pin__watch" href={watchUrl(goal)} target="_blank" rel="noreferrer">Watch it</a>
        <button type="button" className="pin__next display" onClick={onNext}>{last ? 'Full time' : 'Next goal'}</button>
      </div>
    </section>
  );
}

/** Earlier days (up to a week) and the packs. Worked out from the player's own clock. */
function More({ board, packs, query }: { board: BoardView; packs: { id: string; title: string }[]; query: string }) {
  const [earlier, setEarlier] = useState<string[]>([]);
  useEffect(() => {
    const today = dayNumber(localDate(), PIN_EPOCH);
    const out: string[] = [];
    for (let d = today - 1; d >= 1 && out.length < 7; d--) out.push(dateOfDay(d, PIN_EPOCH));
    setEarlier(out);
  }, []);
  return (
    <nav className="pin__more" aria-label="More boards">
      {earlier.length ? (
        <div>
          <h2 className="pin__morehead display">Earlier days</h2>
          <ul>
            {earlier.map((d) => (
              <li key={d}><a href={`/pin/${d}${query}`} aria-current={d === board.id ? 'page' : undefined}>No. {dayNumber(d, PIN_EPOCH)}, {longDate(d)}</a></li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <h2 className="pin__morehead display">Packs</h2>
        <ul>
          {packs.map((p) => (
            <li key={p.id}><a href={`/pin/pack/${p.id}${query}`} aria-current={`pack:${p.id}` === board.id ? 'page' : undefined}>{p.title}</a></li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
