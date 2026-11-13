'use client';
import { useEffect, useState } from 'react';
import { StickerFace, solid } from '../../../components/Sticker';
import { shortClubName } from '../../../components/ClubBadge';
import RunClock from '../../../components/run/RunClock';
import type { RunTaskProps } from '../../../src/lib/run/tasks';
import Trail, { Loop } from '../components/Trail';
import { VERDICT } from '../components/Itk';
import { PICKS, POINTS, roundMark } from '../lib/score';
import { loadPlayed, savePlayed, type Played } from '../lib/progress';
import type { ItkDay, Verdict } from '../lib/types';

/**
 * Check the rumours: careers 1 and 2 of today's Spoofed, each under the run's
 * clock. Picks go to spoofed.progress.v1, so the daily resumes at career 3.
 * A clock that runs out is a miss: the picks are padded to two with index
 * -1 (no card), so the daily reads the career as missed too.
 */
const BEAT = 520;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SpoofedRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [day, setDay] = useState<ItkDay | null | undefined>(undefined);
  useEffect(() => {
    fetch(`/api/spoofed/day?date=${date}`)
      .then((r) => (r.ok ? (r.json() as Promise<ItkDay>) : null))
      .then(setDay, () => setDay(null));
  }, [date]);
  if (day === undefined) return null;
  // No day to play: filed as nothing, so the run is never stuck.
  if (day === null) return <Missing next={next} onDone={() => onDone({ score: 0 })} />;
  return <Careers day={day} items={def.items} clockMs={def.clockMs} next={next} onDone={onDone} />;
}

function Missing({ next, onDone }: { next: string; onDone: () => void }) {
  return (
    <div className="run-task run-task--missing">
      <p>No careers today.</p>
      <button type="button" className="lobby-play" onClick={onDone}>{next}</button>
    </div>
  );
}

function Careers({ day, items, clockMs, next, onDone }: { day: ItkDay; items: number; clockMs: number; next: string; onDone: RunTaskProps['onDone'] }) {
  const [played, setPlayed] = useState<Played>(() => loadPlayed(day.date, day.rounds.length));
  const marks = played.picks.slice(0, items).map((p) => roundMark(p.map((x) => x.fake)));
  const open = marks.findIndex((m) => !m);
  const [view, setView] = useState(open === -1 ? items - 1 : open);
  const [pending, setPending] = useState<number | null>(null);
  const r = day.rounds[view]!;
  const mark = marks[view];
  const picks = played.picks[view]!;

  function save(round: number, add: Played['picks'][number], v: Verdict | null) {
    setPlayed((cur) => {
      const at = <T,>(xs: T[], x: T) => xs.map((y, i) => (i === round ? x : y));
      const nextPlayed: Played = {
        picks: at(cur.picks, [...cur.picks[round]!, ...add]),
        fakes: v && v.fakeIndex !== null ? at(cur.fakes, v.fakeIndex) : cur.fakes,
        reals: v && v.fakeIndex !== null ? at(cur.reals, v.real) : cur.reals,
      };
      savePlayed(day.date, nextPlayed);
      return nextPlayed;
    });
  }

  const ask = (round: number, index: number, last: boolean) =>
    fetch('/api/spoofed/pick', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: day.date, round, index, last }),
    }).then((x) => (x.ok ? (x.json() as Promise<Verdict>) : null), () => null);

  async function pick(index: number) {
    if (pending !== null || mark || picks.some((p) => p.index === index)) return;
    setPending(index);
    const round = view;
    const [v] = await Promise.all([ask(round, index, picks.length + 1 >= PICKS), sleep(BEAT)]);
    setPending(null);
    if (v) save(round, [{ index, fake: v.fake }], v);
  }

  async function timeUp() {
    const round = view;
    const v = await ask(round, -1, true);
    const left = PICKS - played.picks[round]!.length;
    save(round, Array.from({ length: left }, () => ({ index: -1, fake: false })), v);
  }

  function finish() {
    const all = marks as NonNullable<(typeof marks)[number]>[];
    const score = 25 * all.reduce((n, m) => n + POINTS[m], 0);
    // The find: a spoof spotted first time, on the longer career if both were.
    const firsts = all.flatMap((m, i) => (m === 'held' ? [i] : [])).sort((a, b) => day.rounds[b]!.stops.length - day.rounds[a]!.stops.length);
    const f = firsts[0];
    const fake = f !== undefined && played.fakes[f] != null ? day.rounds[f]!.stops[played.fakes[f]!] : undefined;
    onDone({ score, ...(f !== undefined && fake ? { findScore: 100, find: `Spotted first time: ${day.rounds[f]!.player.name} never joined ${shortClubName(fake.name)}` } : {}) });
  }

  return (
    <div className="itk run-task">
      <RunClock key={`clock${view}`} ms={clockMs} running={!mark && pending === null} onEnd={timeUp} />
      <div className="itk__bar">
        <ol className="itk-pips" aria-label="Careers">
          {marks.map((m, i) => (
            <li key={i}>
              <span className={`itk-pip ${m ? `itk-pip--${m}` : ''} ${i === view ? 'is-current' : ''}`} aria-label={`Career ${i + 1}${m ? `, ${VERDICT[m].toLowerCase()}` : ''}`} />
            </li>
          ))}
        </ol>
        <span className="itk-picks" aria-label={`${PICKS - picks.length} of ${PICKS} picks left`}>
          {Array.from({ length: PICKS }, (_, i) => <Loop key={i} className={`itk-picks__loop ${i < picks.length ? 'is-used' : ''}`} />)}
        </span>
      </div>
      <section className="itk-stage run-spoofed" key={`stage${view}`}>
        <div className={`itk-stage__who ${mark ? `is-${mark}` : ''}`}>
          <StickerFace player={r.player} image={r.image ?? undefined} ground={solid(r.ground)} className="sticker--still" />
        </div>
        <Trail stops={r.stops} picks={picks} fakeIndex={played.fakes[view] ?? null} real={played.reals[view] ?? null} pending={pending} locked={Boolean(mark)} onPick={pick} />
      </section>
      <div className="itk-status" aria-live="polite">
        {mark ? (
          <>
            <span className={`itk-status__chip itk-status__chip--${mark}`} aria-hidden />
            <span className="itk-status__verdict display">{picks.some((p) => p.index === -1) ? 'Out of time' : VERDICT[mark]}</span>
            <button type="button" className="lobby-play lobby-small itk-status__next" onClick={() => (view < items - 1 ? setView(view + 1) : finish())}>
              {view < items - 1 ? 'Next career' : next}
            </button>
          </>
        ) : (
          <span className="itk-status__hint">{picks.length === 0 ? 'One of these moves never happened.' : 'Real move. One pick left.'}</span>
        )}
      </div>
    </div>
  );
}
