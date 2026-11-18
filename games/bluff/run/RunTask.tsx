'use client';
import { useEffect, useState } from 'react';
import RunClock from '../../../components/run/RunClock';
import { loadItems, saveItems } from '../../../src/lib/run/progress';
import type { RunTaskProps } from '../../../src/lib/run/tasks';
import { Scoreline } from '../components/Game';
import Pitch, { type Mark } from '../components/Pitch';
import { sameAt, type At } from '../lib/match';
import { MOLE_TAPS, MOLES_A_DAY, moleScore } from '../lib/run';
import type { RunMoleView } from '../server';

/**
 * Find the mole: the run's planted XIs a day (games/bluff/data/run.json), two
 * of them. Each a real XI with one name that didn't start; up to two taps
 * under one clock an XI. Odd Man Out has no daily, so the taps live in the
 * run's record.
 */
type Xi = { taps: [number, number][]; out?: boolean };
type State = { xis: Xi[] };

const post = (date: string, n: number, s: Xi) => fetch('/api/odd-man-out/run', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, n, ...s }),
}).then((r) => (r.ok ? (r.json() as Promise<RunMoleView>) : null), () => null);

/** A record from before two XIs a day held one XI's taps against a different mole: start again. */
const load = (date: string): State => {
  const s = loadItems<State>(date, 'mole');
  return s && Array.isArray(s.xis) ? s : { xis: [] };
};

export default function MoleRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [state, setState] = useState<State>(() => load(date));
  // The XI on screen: the first not yet over (an XI is saved once over or tapped).
  const [n, setN] = useState(() => Math.min(Math.max(0, state.xis.length - 1), MOLES_A_DAY - 1));
  const [view, setView] = useState<RunMoleView | null | undefined>(undefined);
  // Earlier XIs, as judged: for the task's mean and its find.
  const [earlier, setEarlier] = useState<RunMoleView[]>([]);
  const [pick, setPick] = useState<At | null>(null);
  const [busy, setBusy] = useState(false);
  const xi = state.xis[n] ?? { taps: [] };
  useEffect(() => {
    void post(date, n, state.xis[n] ?? { taps: [] }).then(setView);
    void Promise.all(state.xis.slice(0, n).map((x, i) => post(date, i, x))).then((vs) => setEarlier(vs.flatMap((v) => (v ? [v] : []))));
  }, [date, n]); // eslint-disable-line react-hooks/exhaustive-deps

  if (view === undefined) return null;
  if (view === null) {
    return (
      <div className="run-task run-task--missing">
        <p>No XI today.</p>
        <button type="button" className="lobby-play" onClick={() => onDone({ score: 0 })}>{next}</button>
      </div>
    );
  }

  async function send(x: Xi) {
    if (busy) return;
    setBusy(true);
    const v = await post(date, n, x);
    setBusy(false);
    if (!v) return;
    const s = { xis: [...state.xis.slice(0, n), x] };
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
    ? caught === 0 ? 'Found first time.' : caught > 0 ? 'Found on the second go.' : xi.out && v.taps.length < MOLE_TAPS ? 'Out of time.' : 'Not found.'
    : v.taps.length ? `Started. ${left === 1 ? 'Last go.' : 'Go again.'}` : 'Tap the one who didn’t start.';
  const last = n >= v.of - 1;

  function onward() {
    if (!last) {
      setView(undefined);
      setN(n + 1);
      return;
    }
    const all = [...earlier, v];
    const of = (x: RunMoleView) => moleScore(x.taps.map((t) => t.right));
    // The find: an XI whose mole was caught first time.
    const first = all.find((x) => x.taps[0]?.right && x.reveal);
    onDone({
      score: Math.round((all.reduce((a, x) => a + of(x), 0) / MOLES_A_DAY) * 10) / 10,
      ...(first ? { find: `Mole spotted: ${first.reveal!.fake.slice(first.reveal!.fake.indexOf(' ') + 1)}, ${first.team} ${first.played.slice(0, 4)}`, findScore: 100 } : {}),
    });
  }

  return (
    <div className="bluff run-task run-mole">
      <RunClock key={`xi${n}`} ms={def.clockMs} running={!done && !busy} onEnd={() => void send({ taps: [...xi.taps, ...(pick ? [[pick[0], pick[1]] as [number, number]] : [])], out: true })} />
      <div className="bf-stage">
        <div className="bf-stage__head">
          <header className="bf-ask">
            <p className="run-mole__count">XI {n + 1} of {v.of}</p>
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
            <button type="button" className="lobby-play" onClick={onward}>{last ? next : 'Next XI'}</button>
          ) : (
            <button type="button" className="lobby-play" disabled={!pick || busy} onClick={() => void send({ taps: [...xi.taps, [pick![0], pick![1]]] })}>That’s the mole</button>
          )}
        </div>
      </div>
    </div>
  );
}
