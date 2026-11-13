'use client';
import { useEffect, useState } from 'react';
import RunClock from '../../../components/run/RunClock';
import { loadItems, saveItems } from '../../../src/lib/run/progress';
import type { RunTaskProps } from '../../../src/lib/run/tasks';
import { Scoreline } from '../components/Game';
import Pitch, { type Mark } from '../components/Pitch';
import { sameAt, type At } from '../lib/match';
import { matchName, MOLE_TAPS, moleScore } from '../lib/run';
import type { RunMoleView } from '../server';

/**
 * Find the mole: the run's planted XI a day (games/bluff/data/run.json). One
 * real XI with one name that didn't start; up to two taps under one clock.
 * Odd Man Out has no daily, so the taps live in the run's record.
 */
type State = { taps: [number, number][]; out?: boolean };

const post = (date: string, s: State) => fetch('/api/odd-man-out/run', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, ...s }),
}).then((r) => (r.ok ? (r.json() as Promise<RunMoleView>) : null), () => null);

export default function MoleRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [state, setState] = useState<State>(() => loadItems<State>(date, 'mole') ?? { taps: [] });
  const [view, setView] = useState<RunMoleView | null | undefined>(undefined);
  const [pick, setPick] = useState<At | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void post(date, state).then(setView); }, [date]);

  if (view === undefined) return null;
  if (view === null) {
    return (
      <div className="run-task run-task--missing">
        <p>No XI today.</p>
        <button type="button" className="lobby-play" onClick={() => onDone({ score: 0 })}>{next}</button>
      </div>
    );
  }

  async function send(s: State) {
    if (busy) return;
    setBusy(true);
    const v = await post(date, s);
    setBusy(false);
    if (!v) return;
    saveItems(date, 'mole', s);
    setState(s);
    setView(v);
    setPick(null);
  }

  const v = view;
  const done = v.reveal !== null;
  const caught = v.taps.findIndex((t) => t.right);
  const score = moleScore(v.taps.map((t) => t.right));
  const side = { team: v.team, opponent: v.opponent, score: v.score, comp: v.comp, date: v.played, formation: v.formation };
  const mark = (at: At): Mark => (v.taps.some((t) => !t.right && sameAt(t.at, at)) ? 'real' : pick && sameAt(pick, at) ? 'picked' : null);
  const left = MOLE_TAPS - v.taps.length;
  const sub = done
    ? caught === 0 ? 'Found first time.' : caught > 0 ? 'Found on the second go.' : state.out && v.taps.length < MOLE_TAPS ? 'Out of time.' : 'Not found.'
    : v.taps.length ? `Started. ${left === 1 ? 'Last go.' : 'Go again.'}` : 'Tap the one who didn’t start.';

  function finish() {
    onDone({
      score,
      ...(caught === 0 ? { find: `Found the mole first time: ${v.reveal!.fake} in ${v.team}’s XI, ${matchName(side)}`, findScore: 100 } : {}),
    });
  }

  return (
    <div className="bluff run-task run-mole">
      <RunClock ms={def.clockMs} running={!done && !busy} onEnd={() => void send({ taps: [...state.taps, ...(pick ? [[pick[0], pick[1]] as [number, number]] : [])], out: true })} />
      <div className="bf-stage">
        <div className="bf-stage__head">
          <header className="bf-ask">
            {done ? <h2 className="bf-ask__head display">+{score}</h2> : null}
            <p className="bf-ask__sub">{sub}</p>
          </header>
          <Scoreline side={side} />
        </div>
        <div className="bf-stage__pitch">
          <Pitch
            lines={v.lines.map((line) => line.map((name) => ({ id: null, name, pos: '' })))}
            team={v.team}
            mark={mark}
            onTap={done || busy ? null : setPick}
            reveal={v.reveal ? { at: v.reveal.at, real: { id: null, name: v.reveal.real, pos: '' }, caught: caught >= 0 } : null}
          />
        </div>
        <div className="bf-stage__controls">
          {done ? (
            <button type="button" className="lobby-play" onClick={finish}>{next}</button>
          ) : (
            <button type="button" className="lobby-play" disabled={!pick || busy} onClick={() => void send({ taps: [...state.taps, [pick![0], pick![1]]] })}>That’s the mole</button>
          )}
        </div>
      </div>
    </div>
  );
}
