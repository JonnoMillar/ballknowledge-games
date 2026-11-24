'use client';
import { useEffect, useState, type ComponentType } from 'react';
import Back from '../Back';
import { dayNumber, localDate } from '../../src/lib/daily';
import { markDone } from '../../src/lib/today';
import { RUN_TASKS, type RunTaskDef, type RunTaskProps, type TaskId, type TaskResult } from '../../src/lib/run/tasks';
import {
  bandOf, bandWord, bell, bestMoment, markOf, MARK_WORD, money, reportValue, runScore, shareLine, topPercent, type TaskMark,
} from '../../src/lib/run/score';
import { allRuns, bestThisMonth, loadRunDay, saveRunDay, streakDates, streakOf, type RunDay } from '../../src/lib/run/progress';

/**
 * The daily run: every daily in one go, each cut down and framed as a
 * scout's task, then one report (docs/daily-run.md). The route hands in the
 * games' RunTasks; this shell never imports a game. It runs the tasks in
 * RUN_TASKS order that the route supplied, resumes at the first open one,
 * and files the report.
 */
const LEAVE_MS = 420;

export default function Run({ tasks }: { tasks: Partial<Record<TaskId, ComponentType<RunTaskProps>>> }) {
  const [date, setDate] = useState<string | null>(null);
  const [archive, setArchive] = useState(false);
  const [run, setRun] = useState<RunDay>({ results: {} });
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const today = localDate();
    const q = new URLSearchParams(location.search).get('date');
    const d = q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q < today ? q : today;
    setArchive(d !== today);
    setRun(loadRunDay(d));
    setDate(d);
  }, []);

  const list = RUN_TASKS.filter((t) => tasks[t.id]);
  const open = list.find((t) => !run.results[t.id]);
  const day = date ? dayNumber(date) : null;

  function file(def: RunTaskDef, result: TaskResult) {
    if (!date) return;
    // Read fresh: tasks keep their own mid-task state in the same record.
    const cur = loadRunDay(date);
    const results = { ...cur.results, [def.id]: result };
    const last = list.every((t) => results[t.id]);
    const next: RunDay = last
      ? { ...cur, results, finishedOn: localDate(), score: runScore(list.map((t) => results[t.id]!.score)) }
      : { ...cur, results };
    saveRunDay(date, next);
    if (last) markDone('run', date);
    setLeaving(true);
    window.setTimeout(() => { setRun(next); setLeaving(false); window.scrollTo({ top: 0 }); }, LEAVE_MS);
  }

  const Task = open ? tasks[open.id]! : null;
  const i = open ? list.indexOf(open) : -1;
  const after = list[i + 1];

  return (
    <div className="app run">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/run">{archive ? 'Assignment' : 'Today’s assignment'}</a>
        <div className="masthead__meta">{day ? <span>#{day}</span> : null}</div>
      </header>
      <main className="run__main">
        {!date ? null : Task && open ? (
          <section className={`run-sheet ${leaving ? 'is-leaving' : ''}`} key={open.id}>
            <Checklist list={list} run={run} current={open.id} />
            <div className="run-head">
              <span className="run-eyebrow">{open.name}</span>
              <p className="run-head__rule">{open.rule}</p>
            </div>
            <Task date={date} def={open} next={after ? `Next: ${after.name}` : 'Your report'} onDone={(r) => file(open, r)} />
          </section>
        ) : (
          <Report day={day!} archive={archive} list={list} run={run} />
        )}
      </main>
    </div>
  );
}

/** The dossier's checklist: every task, a mark once filed. */
function Checklist({ list, run, current, reveal = false }: { list: RunTaskDef[]; run: RunDay; current?: TaskId; reveal?: boolean }) {
  const [shown, setShown] = useState<TaskId | null>(null);
  return (
    <ol className={`run-list ${reveal ? 'run-list--report' : ''}`}>
      {list.map((t, i) => {
        const r = run.results[t.id];
        const mark = r ? markOf(r.score) : null;
        return (
          <li key={t.id} className={t.id === current ? 'is-current' : undefined} style={{ ['--i' as string]: i }}>
            {reveal && r ? (
              <button type="button" className="run-list__row" onClick={() => setShown(shown === t.id ? null : t.id)} aria-expanded={shown === t.id}>
                <Mark mark={mark!} />
                <span className="run-list__name">{t.name}</span>
                {shown === t.id ? <span className="run-list__score">{r.score.toFixed(1)}</span> : null}
              </button>
            ) : (
              <span className="run-list__row">
                {mark ? <Mark mark={mark} /> : <span className="run-mark run-mark--open" aria-hidden />}
                <span className="run-list__name">{t.name}</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Shape and lightness, never hue alone: a solid disc with a tick, a half disc, a hollow ring with a cross. */
export function Mark({ mark }: { mark: TaskMark }) {
  return (
    <span className={`run-mark run-mark--${mark}`} role="img" aria-label={MARK_WORD[mark]}>
      <svg viewBox="0 0 22 22" aria-hidden>
        {mark === 'clean' ? <path d="M6.2 11.4l3.2 3.2 6.4-6.8" /> : mark === 'miss' ? <path d="M7.6 7.6l6.8 6.8M14.4 7.6l-6.8 6.8" /> : null}
      </svg>
    </span>
  );
}

/** The report value, counting up from nothing as it lands. */
function useCountUp(to: number, delay: number, ms = 1300): number {
  const [x, setX] = useState(to);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setX(0);
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const u = Math.min(1, Math.max(0, (now - t0) / ms));
      setX(to * (1 - (1 - u) ** 3));
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, ms]);
  return x;
}

/** A real transfer of about the report's value (section 4a), from /api/run/deal. */
function useDeal(m: number): { line: string; fee: number; year: number; from: string } | null {
  const [deal, setDeal] = useState<{ line: string; fee: number; year: number; from: string } | null>(null);
  useEffect(() => {
    fetch(`/api/run/deal?m=${m}`).then((r) => (r.ok ? r.json() : null)).then(setDeal, () => setDeal(null));
  }, [m]);
  return deal;
}

/** Report stages (ms): marks tick in, the result lands, the find, then the rest. */
const AT = { marks: 200, result: 900, find: 2400, rest: 3000 };

function Report({ day, archive, list, run }: { day: number; archive: boolean; list: RunTaskDef[]; run: RunDay }) {
  const r = run.score ?? runScore(list.map((t) => run.results[t.id]?.score ?? 0));
  const shown = useCountUp(r, AT.result + 300);
  const deal = useDeal(Math.round(reportValue(r) * 10) / 10);
  const [dealOpen, setDealOpen] = useState(false);
  const runs = allRuns();
  const today = localDate();
  const streak = streakOf(streakDates(runs), today);
  const top = topPercent(r);
  const best = bestThisMonth(runs, today);
  const find = bestMoment(run.results);
  const [copied, setCopied] = useState(false);
  async function share() {
    const marks = list.map((t) => markOf(run.results[t.id]?.score ?? 0));
    await navigator.clipboard?.writeText(shareLine({ day, archive, r, marks, streak: streak.current })).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  const stage = (ms: number) => ({ ['--at' as string]: `${ms}ms` });
  return (
    <section className="run-report cards-grade">
      <div className="run-report__col">
        <div className="run-report__marks" style={stage(AT.marks)}>
          <Checklist list={list} run={run} reveal />
        </div>
        <div className="run-result" style={stage(AT.result)}>
          <span className="run-eyebrow">Ball knowledge</span>
          <span className={`run-band display slab--${bandOf(r)}`}>{bandWord(r)}</span>
          <span className="run-value">Report valued at <b>{money(reportValue(shown))}</b></span>
          {deal ? (
            <button type="button" className="run-deal" onClick={() => setDealOpen(!dealOpen)} aria-expanded={dealOpen}>
              {deal.line}{dealOpen ? <span>, {money(deal.fee / 1e6)} from {deal.from}, {deal.year}</span> : null}
            </button>
          ) : null}
        </div>
      </div>
      <div className="run-report__col">
        {find ? (
          <div className="run-find run-stage" style={stage(AT.find)}>
            <span className="run-eyebrow">Your find</span>
            <p className="run-find__line display">{find}</p>
          </div>
        ) : null}
        <div className="run-stage run-standing" style={stage(AT.rest)}>
          <Curve r={r} />
          <p className="run-standing__line">
            {top <= 50 ? <>Top {top}% <span>on our scale</span></> : best !== null ? <>Your best report this month: <b>{money(reportValue(best))}</b></> : null}
          </p>
          {!archive ? (
            <p className="run-streak">
              <b>{streak.current}</b> day{streak.current === 1 ? '' : 's'} in a row
              {streak.banked > 0 ? <span className="run-streak__rest" aria-label={`${streak.banked} rest day${streak.banked > 1 ? 's' : ''} banked`}>{Array.from({ length: streak.banked }, (_, k) => <i key={k} />)}</span> : null}
              <span className="run-streak__best">Best {streak.best}</span>
            </p>
          ) : null}
          {!archive ? <Countdown /> : null}
          <div className="run-actions">
            <button type="button" className="lobby-play" onClick={share}>{copied ? 'Copied' : 'Share'}</button>
            <a className="lobby-quiet" href="/">Back to the board</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Our scale's bell, the player's mark on it with the report value under it. No axis numbers. */
function Curve({ r }: { r: number }) {
  const W = 300, H = 84, base = 70;
  const pts = Array.from({ length: 61 }, (_, k) => k * (100 / 60)).map((x) => `${(x / 100) * W},${base - bell(x) * 58}`);
  const mx = (r / 100) * W;
  return (
    <svg className="run-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Your report on our scale: ${money(reportValue(r))}`}>
      <path className="run-curve__fill" d={`M0,${base} L${pts.join(' L')} L${W},${base} Z`} />
      <path className="run-curve__line" d={`M${pts.join(' L')}`} />
      <line className="run-curve__mark" x1={mx} x2={mx} y1={base - bell(r) * 58 - 6} y2={base} />
      <circle className="run-curve__dot" cx={mx} cy={base - bell(r) * 58} r={4.5} />
      <text className="run-curve__label" x={Math.min(W - 30, Math.max(30, mx))} y={H - 2} textAnchor="middle">{money(reportValue(r))}</text>
    </svg>
  );
}

/** Time to the next assignment, on the player's own clock. */
function Countdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.ceil((midnight.getTime() - now.getTime()) / 60_000);
  return <p className="run-next">Next assignment in {Math.floor(mins / 60)}h {mins % 60}m</p>;
}
