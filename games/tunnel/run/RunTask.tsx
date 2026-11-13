'use client';
import { useEffect, useState } from 'react';
import ClubBadge, { shortClubName } from '../../../components/ClubBadge';
import RunClock from '../../../components/run/RunClock';
import { loadItems, saveItems } from '../../../src/lib/run/progress';
import type { RunTaskProps } from '../../../src/lib/run/tasks';
import { Card, ENDS, LABEL } from '../components/Card';
import { RUN_ORDER_CATS } from '../lib/run';
import { pairsRight, SIZE, trueOrder } from '../lib/rules';
import type { RunOrderView } from './server';

/**
 * Line them up: the run's own five a day (games/tunnel/data/run.json), put
 * in order by age, then by height, a clock each. Tap one, tap another, they
 * swap; Lock in. Pecking Order's daily is not live, so the lines live in the
 * run's record. Height starts from the true age line, as the daily does.
 */
type State = { lines: number[][] };
const PAIRS = (SIZE * (SIZE - 1)) / 2;

const post = (date: string, s: State) => fetch('/api/pecking-order/run', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, ...s }),
}).then((r) => (r.ok ? (r.json() as Promise<RunOrderView>) : null), () => null);

export default function OrderRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [state, setState] = useState<State>(() => loadItems<State>(date, 'order') ?? { lines: [] });
  const [view, setView] = useState<RunOrderView | null | undefined>(undefined);
  useEffect(() => { void post(date, state).then(setView); }, [date]);

  if (view === undefined) return null;
  if (view === null) {
    return (
      <div className="run-task run-task--missing">
        <p>No line today.</p>
        <button type="button" className="lobby-play" onClick={() => onDone({ score: 0 })}>{next}</button>
      </div>
    );
  }
  return <Lines view={view} state={state} date={date} clockMs={def.clockMs} next={next} onDone={onDone} onLocked={(s, v) => { saveItems(date, 'order', s); setState(s); setView(v); }} />;
}

function Lines({ view, state, date, clockMs, next, onDone, onLocked }: {
  view: RunOrderView; state: State; date: string; clockMs: number; next: string;
  onDone: RunTaskProps['onDone']; onLocked: (s: State, v: RunOrderView) => void;
}) {
  const n = RUN_ORDER_CATS.length;
  const [at, setAt] = useState(Math.min(state.lines.length, n - 1));
  const startOf = (i: number) => (i === 0 ? view.players.map((_, k) => k) : trueOrder(view.values[i - 1]!));
  const [order, setOrder] = useState<number[]>(() => state.lines[at] ?? startOf(at));
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const cat = RUN_ORDER_CATS[at]!;
  const locked = state.lines[at];
  const values = view.values[at];
  const scores = view.values.map((v, i) => pairsRight(state.lines[i]!, v));
  const club = shortClubName(view.club.name);

  async function lock(line: number[]) {
    if (busy || locked) return;
    setBusy(true);
    const s = { lines: [...state.lines, line] };
    const v = await post(date, s);
    setBusy(false);
    if (v) onLocked(s, v);
  }

  function pick(slot: number) {
    if (locked) return;
    if (picked === null) return setPicked(slot);
    const o = [...order];
    [o[picked], o[slot]] = [o[slot]!, o[picked]!];
    setOrder(o);
    setPicked(null);
  }

  function go() {
    if (at < n - 1) {
      setAt(at + 1);
      setOrder(startOf(at + 1));
      setPicked(null);
      return;
    }
    const perfect = RUN_ORDER_CATS.filter((_, i) => scores[i] === PAIRS);
    onDone({
      score: Math.round((scores.reduce((a, s) => a + s, 0) / (n * PAIRS)) * 1000) / 10,
      ...(perfect.length ? { find: `Perfect line: ${club}’s five by ${perfect.map((c) => LABEL[c].toLowerCase()).join(' and ')}`, findScore: 100 } : {}),
    });
  }

  const truth = values ? trueOrder(values) : null;
  const [low, high] = ENDS[cat];
  return (
    <div className="sorted run-task run-order">
      <RunClock key={`clock${at}`} ms={clockMs} running={!locked && !busy} onEnd={() => void lock(order)} />
      <div className="run-order__head">
        <span className="run-order__club"><ClubBadge clubId={view.club.id} club={view.club} size={28} /> Five who played for {club}</span>
        <h2 className="run-order__cat display">{LABEL[cat]} <span>{at + 1} of {n}</span></h2>
      </div>
      <div className="tn-line">
        <span className="tn-end">{low}</span>
        <ol className="tn-cards">
          {(locked ?? order).map((p, slot) => (
            <Card
              key={view.players[p]!.id}
              player={view.players[p]!}
              idx={p}
              cat={cat}
              value={values ? values[p]! : null}
              right={truth ? truth[slot] === p : null}
              selected={picked === slot}
              onPick={() => pick(slot)}
              disabled={!!locked || busy}
            />
          ))}
        </ol>
        <span className="tn-end">{high}</span>
      </div>
      <div className="run-order__act" aria-live="polite">
        {locked ? (
          <>
            <p className="run-order__score"><b className="display">{scores[at]}/{PAIRS}</b> pairs in the right order</p>
            <button type="button" className="lobby-play" onClick={go}>{at < n - 1 ? `Next: ${LABEL[RUN_ORDER_CATS[at + 1]!]}` : next}</button>
          </>
        ) : (
          <>
            <p className="run-order__hint">Tap one, then another, to swap them.</p>
            <button type="button" className="lobby-play" disabled={busy} onClick={() => void lock(order)}>Lock in</button>
          </>
        )}
      </div>
    </div>
  );
}
