'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
 * in order by age, then by height, a clock each. Drag a card into another
 * slot (the rest shuffle along), or tap two to swap; Lock in, the values land
 * least to most and the five walk into their true line (Pecking Order's own
 * reveal, from its branch). Pecking Order's daily is not live, so the lines
 * live in the run's record. Height starts from the true age line.
 */
type State = { lines: number[][] };
const PAIRS = (SIZE * (SIZE - 1)) / 2;
/** The values land one card at a time, least to most, STEP apart; a beat, then the five walk into their true line. */
const STEP = 380;
const BEAT = 600;

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
  const N = view.players.length;
  const [at, setAt] = useState(Math.min(state.lines.length, n - 1));
  const startOf = (i: number) => (i === 0 ? view.players.map((_, k) => k) : trueOrder(view.values[i - 1]!));
  const lockedAt = state.lines[at];
  // The line on screen: the player's own until locked, then the truth once the five have walked.
  const [line, setLine] = useState<number[]>(() => (lockedAt && view.values[at] ? trueOrder(view.values[at]!) : startOf(at)));
  const [picked, setPicked] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // How many cards have shown their value; N + 1 once the five have walked and the verdict may show.
  const [revealed, setRevealed] = useState(lockedAt ? N + 1 : 0);
  const [live, setLive] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const listRef = useRef<HTMLOListElement>(null);
  const lineRef = useRef(line);
  lineRef.current = line;
  const drag = useRef<{ p: number; gx: number; gy: number; px: number; py: number; sx: number; sy: number; moved: boolean } | null>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const ignoreClick = useRef(false);

  const cat = RUN_ORDER_CATS[at]!;
  const values = view.values[at];
  const truth = values ? trueOrder(values) : null;
  const scores = view.values.map((v, i) => pairsRight(state.lines[i]!, v));
  const club = shortClubName(view.club.name);
  const cardEl = (p: number) => listRef.current?.querySelector<HTMLElement>(`.tn-card[data-p="${p}"]`) ?? null;

  /** The dragged card rides under the pointer, wherever its slot now is. */
  function place() {
    const d = drag.current;
    const el = d && cardEl(d.p);
    if (!d || !el) return;
    el.style.transform = 'none';
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${d.px - d.gx - r.left}px, ${d.py - d.gy - r.top}px) scale(1.03)`;
  }

  // After the line changes the cards glide from where they were (FLIP); a dragged one stays under the pointer.
  useLayoutEffect(() => {
    const old = before.current;
    before.current = null;
    const d = drag.current;
    if (d?.moved) place();
    if (!old || !listRef.current) return;
    listRef.current.querySelectorAll<HTMLElement>('.tn-card').forEach((b) => {
      if (d?.moved && Number(b.dataset.p) === d.p) return;
      const o = old.get(b.dataset.p!);
      if (!o) return;
      b.style.transition = 'none';
      b.style.transform = 'none';
      const r = b.getBoundingClientRect();
      if (o.left !== r.left || o.top !== r.top) {
        b.style.transform = `translate(${o.left - r.left}px, ${o.top - r.top}px)`;
        b.getBoundingClientRect();
      }
      b.style.transition = '';
      b.style.transform = '';
    });
  }, [line]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Snapshot every card, then set the line: the layout effect glides them from there. */
  function glideTo(nx: number[]) {
    if (listRef.current) before.current = new Map([...listRef.current.querySelectorAll<HTMLElement>('.tn-card')].map((b) => [b.dataset.p!, b.getBoundingClientRect()]));
    lineRef.current = nx;
    setLine(nx);
  }

  function down(e: React.PointerEvent<HTMLButtonElement>, p: number) {
    if (lockedAt || busy || e.button !== 0 || drag.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const d = { p, gx: e.clientX - r.left, gy: e.clientY - r.top, px: e.clientX, py: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    drag.current = d;
    const move = (ev: PointerEvent) => {
      d.px = ev.clientX;
      d.py = ev.clientY;
      if (!d.moved) {
        if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return;
        d.moved = true;
        setPicked(null);
        setDragging(p);
      }
      place();
      // The slot nearest the pointer, along the way the line runs (across on a desk, down on a phone).
      const list = listRef.current!;
      const kids = [...list.children].map((li) => li.getBoundingClientRect());
      const across = kids.length > 1 && Math.abs(kids[1]!.left - kids[0]!.left) > Math.abs(kids[1]!.top - kids[0]!.top);
      const pos = across ? ev.clientX : ev.clientY;
      let slot = 0;
      let best = Infinity;
      kids.forEach((b, k) => {
        const gap = Math.abs(pos - (across ? b.left + b.width / 2 : b.top + b.height / 2));
        if (gap < best) { best = gap; slot = k; }
      });
      const cur = lineRef.current;
      if (slot === cur.indexOf(p)) return;
      const nx = cur.filter((x) => x !== p);
      nx.splice(slot, 0, p);
      glideTo(nx);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      drag.current = null;
      if (!d.moved) return;
      // The click that follows a drop is not a tap.
      ignoreClick.current = true;
      setTimeout(() => { ignoreClick.current = false; }, 60);
      const el = cardEl(p);
      if (el) el.style.transform = '';
      setDragging(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /** Tap one, tap another: they swap. */
  function tap(p: number) {
    if (lockedAt || busy || ignoreClick.current) return;
    if (picked === null) return setPicked(p);
    if (picked === p) return setPicked(null);
    const a = line.indexOf(picked);
    const b = line.indexOf(p);
    const nx = [...line];
    [nx[a], nx[b]] = [nx[b]!, nx[a]!];
    setPicked(null);
    glideTo(nx);
  }

  async function lock(mine: number[]) {
    if (busy || lockedAt) return;
    setBusy(true);
    setPicked(null);
    const s = { lines: [...state.lines, mine] };
    const v = await post(date, s);
    setBusy(false);
    if (!v) return;
    const vals = v.values[at]!;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLive(!calm);
    setRevealed(calm ? N + 1 : 0);
    onLocked(s, v);
    if (calm) return glideTo(trueOrder(vals));
    for (let k = 1; k <= N; k++) timers.current.push(setTimeout(() => setRevealed(k), k * STEP));
    timers.current.push(setTimeout(() => { glideTo(trueOrder(vals)); setRevealed(N + 1); }, N * STEP + BEAT));
  }

  function go() {
    if (at < n - 1) {
      setAt(at + 1);
      setLine(startOf(at + 1));
      setRevealed(0);
      setLive(false);
      setPicked(null);
      return;
    }
    const perfect = RUN_ORDER_CATS.filter((_, i) => scores[i] === PAIRS);
    onDone({
      score: Math.round((scores.reduce((a, s) => a + s, 0) / (n * PAIRS)) * 1000) / 10,
      ...(perfect.length ? { find: `Perfect line: ${club} by ${perfect.map((c) => LABEL[c].toLowerCase()).join(' and ')}`, findScore: 100 } : {}),
    });
  }

  const [low, high] = ENDS[cat];
  const walked = revealed > N;
  const inPlace = lockedAt && truth ? lockedAt.filter((p, k) => truth[k] === p).length : 0;
  return (
    <div className="sorted run-task run-order">
      <RunClock key={`clock${at}`} ms={clockMs} running={!lockedAt && !busy} onEnd={() => void lock(lineRef.current)} />
      <div className="run-order__head">
        <span className="run-order__club"><ClubBadge clubId={view.club.id} club={view.club} size={28} /> Five who played for {club}</span>
        <h2 className="run-order__cat display">{LABEL[cat]} <span>{at + 1} of {n}</span></h2>
      </div>
      <div className="tn-line">
        <span className="tn-end">{low}</span>
        <ol className="tn-cards" ref={listRef}>
          {line.map((p) => {
            const shownNow = !truth || truth.indexOf(p) < revealed;
            const was = lockedAt ? lockedAt.indexOf(p) : -1;
            const right = truth && lockedAt && shownNow ? truth.indexOf(p) === was : null;
            return (
              <Card
                key={view.players[p]!.id}
                player={view.players[p]!}
                idx={p}
                cat={cat}
                value={values ? values[p]! : null}
                shown={shownNow}
                roll={live}
                right={right}
                badge={walked}
                selected={picked === p}
                dragging={dragging === p}
                onDown={(e) => down(e, p)}
                onPick={() => tap(p)}
                disabled={!!lockedAt || busy}
              />
            );
          })}
        </ol>
        <span className="tn-end">{high}</span>
      </div>
      <div className="run-order__act" aria-live="polite">
        {lockedAt ? (walked ? (
          <>
            <p className="run-order__score">
              <b className="display">{scores[at]}/{PAIRS}</b> pairs in the right order
              <span className="run-order__verdict">{scores[at] === PAIRS ? 'Perfect line' : `${inPlace} of ${N} in the right spot`}</span>
            </p>
            <button type="button" className="lobby-play" onClick={go}>{at < n - 1 ? `Next: ${LABEL[RUN_ORDER_CATS[at + 1]!]}` : next}</button>
          </>
        ) : <p className="run-order__hint">Checking the line…</p>) : (
          <>
            <p className="run-order__hint">Drag them into order, or tap two to swap.</p>
            <button type="button" className="lobby-play" disabled={busy} onClick={() => void lock(line)}>Lock in</button>
          </>
        )}
      </div>
    </div>
  );
}
