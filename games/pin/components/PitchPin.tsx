'use client';
import { useEffect, useState } from 'react';
import Pitch from './Pitch';
import FullTime from './FullTime';
import { localDate, longDate } from '../../../src/lib/daily';
import { nextPack, readStore, record, recordThrow, type Store, type Throw } from '../lib/progress';
import { points, ring, RING_NAME } from '../lib/score';
import type { Spot } from '../lib/pitch';
import type { Answer, BoardView, GoalCard as Card } from '../lib/types';
import Back from '../../../components/Back';

/**
 * A Pitch pin pack: its goals, one throw each. The page holds no answers;
 * each throw goes to /api/pin/throw and the answer comes back for that goal
 * alone. Progress is kept in the browser so a refresh resumes. `order` is
 * the library's packs in shelf order, for the Next pack link and the record.
 * On a laptop it is two columns that fit the window: the goal and the
 * button on the left, the pitch on the right.
 */
export default function PitchPin({ board, order }: {
  board: BoardView; order: { id: string; size: number; title: string }[];
}) {
  const n = board.goals.length;
  const [throws, setThrows] = useState<(Throw | null)[]>(() => Array<Throw | null>(n).fill(null));
  const [store, setStore] = useState<Store>({});
  const [loaded, setLoaded] = useState(false);
  const [pin, setPin] = useState<Spot | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const s = readStore();
    const saved = s[board.id]?.throws;
    if (saved && saved.length === n) setThrows(saved);
    setStore(s);
    setLoaded(true);
  }, [board.id, n]);

  const next = throws.findIndex((t) => !t);
  const done = next === -1 && viewing === null;
  const current = viewing ?? Math.max(next, 0);
  const goal = board.goals[current]!;

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
      const s = recordThrow(board.id, n, next, { pin, answer }, localDate());
      setThrows(s[board.id]!.throws);
      setStore(s);
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
  const pointsSoFar = throws.reduce((a, t) => a + (t ? points(t.answer.distance) : 0), 0);
  const nextId = done ? nextPack(order, store, board.id) : null;

  return (
    <div className={`app pin${loaded && !done ? ' pin--play' : ''}`}>
      <header className="masthead">
        <Back href="/pin" label="Pitch pin" />
        <a className="masthead__brand display" href="/pin">
          <PinLogo />
          Pitch pin
        </a>
        <div className="masthead__meta"><span>{board.title}</span></div>
      </header>

      <main className={`pin__main${done ? '' : ' pin__main--play'}`}>
        {!loaded ? null : done ? (
          <FullTime
            board={board}
            throws={throws as Throw[]}
            next={order.find((p) => p.id === nextId) ?? null}
            rec={record(store, order)}
          />
        ) : (
          <>
            <Ticks n={n} thrown={throws.filter(Boolean).length} current={current} />
            <GoalCard goal={goal} small={shown !== null} />
            <div className="pin__stage">
              {shown ? (
                <Pitch label={`Your pin, ${shown.answer.distance.toFixed(1)} metres from where it was struck`} reveal={{ pin: shown.pin, at: shown.answer.at }} />
              ) : (
                <Pitch label="The attacking half of a pitch, goal at the top. Place your pin." pin={pin} onPin={setPin} onEnter={throwPin} />
              )}
            </div>
            <div className="pin__controls">
              {shown ? (
                <Result t={shown} goal={goal} pointsSoFar={pointsSoFar} last={next === -1} onNext={() => setViewing(null)} />
              ) : (
                <>
                  <p className="pin__hint">Where was it struck from? Tap the pitch, drag to adjust.</p>
                  {failed ? <p className="pin__error" role="alert">Could not reach the ref. Try again.</p> : null}
                  {pointsSoFar ? <p className="pin__hint">So far: <b>{pointsSoFar}</b> points</p> : null}
                  <button type="button" className="pin__throw display" disabled={!pin || busy} onClick={throwPin}>Throw</button>
                </>
              )}
            </div>
          </>
        )}
        <a className="pin__back" href="/pin">All packs</a>
        <p className="pin__credit">
          {board.goals.some((g) => g.credit === 'statsbomb') ? <img src="/credits/statsbomb.png" alt="StatsBomb" height={16} /> : null}
          Shot data: {credits}. Metres on a standard pitch.
        </p>
      </main>
    </div>
  );
}

export function PinLogo() {
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

function Result({ t, goal, pointsSoFar, last, onNext }: {
  t: Throw; goal: Card; pointsSoFar: number; last: boolean; onNext: () => void;
}) {
  const d = t.answer.distance;
  const r = ring(d);
  return (
    <section className="pin__result" aria-live="polite">
      <div className="pin__score">
        <span className="pin__gain">
          <span className="pin__big display">+{points(d)}</span>
          <span className={`pin__ring pin__ring--${r} display`}>{RING_NAME[r]}</span>
        </span>
        <span className="pin__sofar"><span>So far</span><b className="display">{pointsSoFar}</b></span>
      </div>
      <p className="pin__fact">
        <b>{d.toFixed(1)} m off.</b> Struck {t.answer.at.y.toFixed(1)} m out. {xgText(t.answer)}
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
