'use client';
import { useEffect, useState } from 'react';
import RunClock from '../../../components/run/RunClock';
import { loadItems, saveItems } from '../../../src/lib/run/progress';
import type { RunTaskProps } from '../../../src/lib/run/tasks';
import Pitch from '../components/Pitch';
import { GoalCard } from '../components/PitchPin';
import { SPOT, type Spot } from '../lib/pitch';
import { points, ring, RING_NAME } from '../lib/score';
import type { Answer, BoardView } from '../lib/types';

/**
 * Log the shot: the run's own three goals a day (games/pin/data/run.json),
 * one throw each under the run's clock. Pitch pin has no daily, so the
 * throws live in the run's record. A clock that runs out with no pin down
 * is a miss: the true spot is still shown.
 */
type Thrown = { pin: Spot | null; answer: Answer };

export default function PinRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [board, setBoard] = useState<BoardView | null | undefined>(undefined);
  useEffect(() => {
    fetch(`/api/pin/run?date=${date}`)
      .then((r) => (r.ok ? (r.json() as Promise<BoardView>) : null))
      .then(setBoard, () => setBoard(null));
  }, [date]);
  if (board === undefined) return null;
  if (board === null) {
    return (
      <div className="run-task run-task--missing">
        <p>No goals today.</p>
        <button type="button" className="lobby-play" onClick={() => onDone({ score: 0 })}>{next}</button>
      </div>
    );
  }
  return <Goals board={board} date={date} clockMs={def.clockMs} next={next} onDone={onDone} />;
}

const scoreOf = (t: Thrown) => (t.pin ? points(t.answer.distance) : 0);

function Goals({ board, date, clockMs, next, onDone }: { board: BoardView; date: string; clockMs: number; next: string; onDone: RunTaskProps['onDone'] }) {
  const n = board.goals.length;
  const [throws, setThrows] = useState<(Thrown | null)[]>(() => {
    const saved = loadItems<(Thrown | null)[]>(date, 'pin');
    return saved?.length === n ? saved : Array<Thrown | null>(n).fill(null);
  });
  const open = throws.findIndex((t) => !t);
  const [view, setView] = useState(open === -1 ? n - 1 : open);
  const [pin, setPin] = useState<Spot | null>(null);
  const [busy, setBusy] = useState(false);
  const goal = board.goals[view]!;
  const shown = throws[view] ?? null;

  async function fire(at: Spot | null) {
    if (busy || shown) return;
    setBusy(true);
    const i = view;
    // Out of time with nothing down: ask where it was from, and score it 0.
    const answer = await fetch('/api/pin/throw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ board: board.id, goal: board.goals[i]!.slug, ...(at ?? SPOT) }),
    }).then((r) => (r.ok ? (r.json() as Promise<Answer>) : null), () => null);
    setBusy(false);
    if (!answer) return;
    setThrows((cur) => {
      const nextThrows = cur.map((t, k) => (k === i ? { pin: at, answer } : t));
      saveItems(date, 'pin', nextThrows);
      return nextThrows;
    });
    setPin(null);
  }

  function finish() {
    const all = throws as Thrown[];
    const scores = all.map(scoreOf);
    // The find: the closest bullseye.
    const bulls = all.map((t, i) => ({ t, i })).filter(({ t }) => t.pin && ring(t.answer.distance) === 'bullseye').sort((a, b) => a.t.answer.distance - b.t.answer.distance);
    const b = bulls[0];
    onDone({
      score: Math.round((scores.reduce((a, s) => a + s, 0) / n) * 10) / 10,
      ...(b ? { find: `Bullseye: ${board.goals[b.i]!.scorer}, ${b.t.answer.distance.toFixed(1)} m`, findScore: 100 } : {}),
    });
  }

  const d = shown?.answer.distance ?? 0;
  return (
    <div className="pin run-task run-pin">
      <RunClock key={`clock${view}`} ms={clockMs} running={!shown && !busy} onEnd={() => void fire(pin)} />
      <div className="run-pin__grid">
        <div className="run-pin__side">
          <div className="pin__ticks">
            <span>Goal {view + 1} of {n}</span>
            <ol aria-hidden>
              {throws.map((t, i) => <li key={i} className={`pin__tick${i === view ? ' pin__tick--current' : t ? ' pin__tick--done' : ''}`} />)}
            </ol>
          </div>
          <GoalCard goal={goal} small={shown !== null} />
          <div className="pin__controls">
            {shown ? (
              <section className="pin__result" aria-live="polite">
                <div className="pin__score">
                  <span className="pin__gain">
                    <span className="pin__big display">+{scoreOf(shown)}</span>
                    <span className={`pin__ring pin__ring--${shown.pin ? ring(d) : 'miss'} display`}>{shown.pin ? RING_NAME[ring(d)] : 'Out of time'}</span>
                  </span>
                </div>
                <p className="pin__fact">
                  {shown.pin ? <><b>{d.toFixed(1)} m off.</b> </> : null}Struck {shown.answer.at.y.toFixed(1)} m out.
                </p>
                <button type="button" className="lobby-play" onClick={() => (view < n - 1 ? setView(view + 1) : finish())}>
                  {view < n - 1 ? 'Next goal' : next}
                </button>
              </section>
            ) : (
              <>
                <p className="pin__hint">Tap the pitch, drag to adjust.</p>
                <button type="button" className="lobby-play" disabled={!pin || busy} onClick={() => void fire(pin)}>Throw</button>
              </>
            )}
          </div>
          <p className="pin__credit">
            {board.goals.some((g) => g.credit === 'statsbomb') ? <img src="/credits/statsbomb.png" alt="StatsBomb" height={16} /> : null}
            Shot data: {[...new Set(board.goals.map((g) => (g.credit === 'statsbomb' ? 'StatsBomb open data' : 'Understat')))].join(' and ')}.
          </p>
        </div>
        <div className="pin__stage">
          {shown ? (
            <Pitch key={`r${view}`} label="Where it was struck from" reveal={{ pin: shown.pin ?? shown.answer.at, at: shown.answer.at }} />
          ) : (
            <Pitch key={`a${view}`} label="The attacking half of a pitch, goal at the top. Place your pin." pin={pin} onPin={setPin} onEnter={() => void fire(pin)} />
          )}
        </div>
      </div>
    </div>
  );
}
