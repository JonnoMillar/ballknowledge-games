'use client';
import { useEffect, useMemo, useState } from 'react';
import SearchSheet from '../../../components/SearchSheet';
import { shortClubName } from '../../../components/ClubBadge';
import RunClock from '../../../components/run/RunClock';
import { recordCards, type CardNews } from '../../../src/lib/collection';
import { GRADE_WORD } from '../../../src/lib/chain/grade';
import { localDate } from '../../../src/lib/daily';
import { plateName } from '../../../src/lib/short-name';
import { RUN_REVEAL_MS, type RunTaskProps } from '../../../src/lib/run/tasks';
import { gradeScore } from '../../../src/lib/run/score';
import type { NameEntry } from '../../../src/lib/chain/client';
import { After, Track, useAlbum } from '../components/Step';
import { NAME, STEPS } from '../lib/rules';
import { loadRun, saveRun, type Run } from '../lib/progress';
import type { StepDay, Verdict } from '../lib/types';

/**
 * Trace the link: steps 1 and 2 of today's Steps, one shot each, under the
 * run's clock. Verdicts go to step.progress.v2, so the daily resumes at step
 * 3. The reveal is cut at RUN_REVEAL_MS. A clock that runs out asks the
 * server for a miss (pick '') so the step still shows its answers.
 */
export default function StepRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [day, setDay] = useState<StepDay | null | undefined>(undefined);
  useEffect(() => {
    fetch(`/api/step/day?date=${date}`)
      .then((r) => (r.ok ? (r.json() as Promise<StepDay>) : null))
      .then(setDay, () => setDay(null));
  }, [date]);
  if (day === undefined) return null;
  if (day === null) {
    return (
      <div className="run-task run-task--missing">
        <p>No steps today.</p>
        <button type="button" className="lobby-play" onClick={() => onDone({ score: 0 })}>{next}</button>
      </div>
    );
  }
  return <Steps day={day} items={def.items} clockMs={def.clockMs} next={next} onDone={onDone} />;
}

function Steps({ day, items, clockMs, next, onDone }: { day: StepDay; items: number; clockMs: number; next: string; onDone: RunTaskProps['onDone'] }) {
  const [run, setRun] = useState<Run>(() => loadRun(day.date, STEPS));
  const slice = run.slice(0, items);
  const open = slice.findIndex((v) => v === null);
  const [view, setView] = useState(open === -1 ? items - 1 : open);
  const [chosen, setChosen] = useState<NameEntry | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [news, setNews] = useState<CardNews>(null);
  const index = useAlbum();
  const shown = useMemo(() => ({ ...day, steps: day.steps.slice(0, items) }), [day, items]);

  const step = day.steps[view]!;
  const verdict = run[view] ?? null;
  const earlier = run.flatMap((v) => (v && v.pick.id ? [v.pick.id] : []));
  const taken = useMemo(() => new Set([...day.steps.map((s) => s.player.id), ...earlier]), [day, earlier.join()]);

  async function lock(pick: string) {
    if (pending || verdict) return;
    setPending(true);
    const at = view;
    const res = await fetch('/api/step/pick', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: day.date, step: at, pick, earlier }),
    }).then((r) => (r.ok ? (r.json() as Promise<Verdict>) : null), () => null);
    setPending(false);
    if (!res) return;
    setRun((cur) => {
      const nextRun = cur.map((v, i) => (i === at ? res : v));
      saveRun(day.date, nextRun);
      return nextRun;
    });
    setChosen(null);
    setSearching(false);
    setRevealing(true);
    if (res.held && res.grade && res.pick.clubs) {
      const clubs = res.pick.clubs;
      const n = recordCards([{
        id: res.pick.id, name: res.pick.name, grade: res.grade, board: day.date,
        via: clubs.map((c) => c.club.name), clubs: clubs.map((c) => c.id), date: localDate(),
        source: { label: `${NAME} #${day.day}`, href: `/step?date=${day.date}` },
        ...(res.pick.image ? { image: res.pick.image } : {}),
      }]);
      setNews(n[res.pick.id] ?? null);
    } else setNews(null);
  }

  function finish() {
    const vs = run.slice(0, items) as Verdict[];
    const scores = vs.map((v) => gradeScore(v.grade, v.depth ?? 0));
    // The find: the deepest pick graded Sharp or Elite.
    const best = vs.map((v, i) => ({ v, s: scores[i]! })).filter(({ v }) => v.grade === 'sharp' || v.grade === 'elite').sort((a, b) => b.s - a.s)[0];
    const find = best?.v.pick.clubs ? `${GRADE_WORD[best.v.grade!]} find: ${plateName(best.v.pick.id, best.v.pick.name)} at ${shortClubName(best.v.pick.clubs[1].club.name)}` : undefined;
    onDone({ score: Math.round((scores.reduce((a, b) => a + b, 0) / items) * 10) / 10, ...(find ? { find } : {}) });
  }

  const clubName = shortClubName(step.club.club.name);
  const playerName = plateName(step.player.id, step.player.name);

  return (
    <div className="step cards-grade run-task run-steps">
      <RunClock key={`clock${view}`} ms={clockMs} running={!verdict && !pending} onEnd={() => void lock(chosen?.id ?? '')} />
      <Track
        day={shown} run={slice} view={view} chosen={chosen} hidden={revealing ? view : -1}
        reveal={{ play: true, news: news ?? undefined, cap: RUN_REVEAL_MS, onDone: () => setRevealing(false) }}
        onOpen={() => !verdict && setSearching(true)}
      />
      <section className="step-act" aria-live="polite">
        {verdict ? (
          revealing ? null : (
            <>
              <div className="step-verdict">
                <After verdict={verdict} playerFirst={step.playerFirst} />
              </div>
              <button type="button" className="lobby-play" onClick={() => (view < items - 1 ? setView(view + 1) : finish())}>
                {view < items - 1 ? 'Next step' : next}
              </button>
            </>
          )
        ) : chosen ? (
          <>
            <button type="button" className="lobby-play" onClick={() => void lock(chosen.id)} disabled={pending}>{pending ? 'Locking…' : 'Lock it in'}</button>
            <button type="button" className="lobby-quiet lobby-small" onClick={() => setSearching(true)}>Change</button>
          </>
        ) : (
          <>
            <p className="step-act__rule">
              {step.playerFirst
                ? <>Played for one of <b>{playerName}’s</b> clubs and for <b>{clubName}</b></>
                : <>Played for <b>{clubName}</b> and one of <b>{playerName}’s</b> clubs</>}
            </p>
            <button type="button" className="lobby-play" onClick={() => setSearching(true)}>Name a player</button>
          </>
        )}
      </section>
      <SearchSheet
        slot={searching ? view : null}
        title={`Step ${view + 1}`}
        between={step.playerFirst ? [playerName, clubName] : [clubName, playerName]}
        current={chosen}
        index={index}
        taken={taken}
        onPick={(id) => { setChosen(index?.find((e) => e.player.id === id)?.player ?? null); setSearching(false); }}
        onRemove={() => { setChosen(null); setSearching(false); }}
        onClose={() => setSearching(false)}
      />
    </div>
  );
}
