'use client';
import { useEffect, useState } from 'react';
import RunClock from '../../../components/run/RunClock';
import { loadItems, saveItems } from '../../../src/lib/run/progress';
import { SEASON_PICK_MS, type RunTaskProps } from '../../../src/lib/run/tasks';
import Chart from '../components/Chart';
import { Clue, Crest } from '../components/Clue';
import { INK, seasonLabel } from '../lib/clubs';
import { RUN_GUESSES, runScore } from '../lib/run';
import type { RunSeasonView } from '../server';

/**
 * Read the season: the run's own board a day (games/season-line/data/run.json).
 * The whole line from the start, a five-season window; name the club in
 * three guesses (a squad player after one miss, the top scorer after two),
 * then pick the season. A clock a guess, a shorter one for the season. The
 * daily is untouched, so the guesses live in the run's record.
 */
type State = { clubs: string[]; season?: number | null };

const post = (date: string, s: State) => fetch('/api/season-line/run', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, ...s }),
}).then((r) => (r.ok ? (r.json() as Promise<RunSeasonView>) : null), () => null);

export default function SeasonRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [state, setState] = useState<State>(() => loadItems<State>(date, 'season') ?? { clubs: [] });
  const [view, setView] = useState<RunSeasonView | null | undefined>(undefined);
  const [club, setClub] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void post(date, state).then(setView); }, [date]);

  if (view === undefined) return null;
  if (view === null) {
    return (
      <div className="run-task run-task--missing">
        <p>No season today.</p>
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
    saveItems(date, 'season', s);
    setState(s);
    setView(v);
    setClub('');
  }

  const v = view;
  const clubDone = v.club !== null;
  const done = v.season !== null;
  const off = v.season && v.season.picked !== null ? Math.abs(v.season.picked - v.season.start) : null;
  const years = Array.from({ length: v.window[1] - v.window[0] + 1 }, (_, i) => v.window[0] + i);
  const name = (c: string) => v.clubs.find((x) => x.club === c)?.name ?? c;
  const q = (c: string) => v.clubs.find((x) => x.club === c)?.q ?? null;
  const me = { q: v.club?.q ?? null, colour: v.club?.colour ?? INK, name: v.club?.name };

  function finish() {
    const score = runScore(v.clubAt, off);
    onDone({
      score,
      ...(v.clubAt === 1 && off === 0 ? { find: `First guess: ${v.club!.name} ${seasonLabel(v.season!.start)}`, findScore: 100 } : {}),
    });
  }

  return (
    <div className="sl run-task run-season">
      {!clubDone
        ? <RunClock key={`c${state.clubs.length}`} ms={(def.clockMs)} running={!busy} onEnd={() => void send({ clubs: [...state.clubs, club] })} />
        : !done
          ? <RunClock key="s" ms={SEASON_PICK_MS} running={!busy} onEnd={() => void send({ ...state, season: null })} />
          : <RunClock key="end" ms={SEASON_PICK_MS} running={false} onEnd={() => {}} />}
      <div className="sl-play run-season__grid">
        <section className="sl-card sl-chartcard" aria-label="The season">
          <img className="sl-lion" src="/season-line/pl-lion.png" alt="Premier League" width={27} height={34} />
          <Chart games={v.games} teams={v.teams} line={v.line} me={me} />
        </section>
        <div className="sl-side">
          <p className="run-season__window">Between <b>{seasonLabel(v.window[0])}</b> and <b>{seasonLabel(v.window[1])}</b></p>
          <ul className="sl-clues" aria-label="Clues">
            <Clue kind="squad" label="Squad" name={v.hints.squad} />
            <Clue kind="top" label="Top scorer" name={v.hints.top ? v.hints.top.names.join(' & ') : null} note={v.hints.top ? `${v.hints.top.goals} goals` : undefined} />
          </ul>
          <section className="sl-card sl-guesses">
            {!clubDone ? (
              <form className="sl-form" onSubmit={(e) => { e.preventDefault(); if (club) void send({ clubs: [...state.clubs, club] }); }}>
                <select className="sl-select" aria-label="Club" value={club} onChange={(e) => setClub(e.target.value)}>
                  <option value="" disabled>Club</option>
                  {v.clubs.filter((c) => !state.clubs.includes(c.club)).map((c) => <option key={c.club} value={c.club}>{c.name}</option>)}
                </select>
                <button type="submit" className="lobby-play sl-form__go" disabled={!club || busy}>Guess</button>
              </form>
            ) : !done ? (
              <div className="run-season__pick">
                <span className="sl-locked"><Crest q={v.club!.q} size={24} /><span>{v.club!.name}</span></span>
                <p className="run-season__ask">Which season?</p>
                <div className="run-season__years">
                  {years.map((y) => <button key={y} type="button" className="lobby-quiet lobby-small" disabled={busy} onClick={() => void send({ ...state, season: y })}>{seasonLabel(y)}</button>)}
                </div>
              </div>
            ) : (
              <div className="run-season__end">
                <div className="sl-answer">
                  <Crest q={v.club!.q} size={48} />
                  <div>
                    <p className="sl-answer__name display">{v.club!.name} <span>{seasonLabel(v.season!.start)}</span></p>
                    <p className="sl-answer__champ">{v.season!.champion === v.club!.club ? 'Champions' : `Champions: ${v.season!.championName}`}</p>
                  </div>
                </div>
                <p className="run-season__verdict">
                  {v.season!.picked === null ? 'Out of time on the season' : off === 0 ? 'Season spot on' : off === 1 ? 'Season one off' : `You said ${seasonLabel(v.season!.picked)}`}
                </p>
                <button type="button" className="lobby-play" onClick={finish}>{next}</button>
              </div>
            )}
            <ol className="sl-rows">
              {Array.from({ length: RUN_GUESSES }, (_, i) => {
                const g = v.guesses[i];
                return (
                  <li key={i} className={`sl-row${g ? '' : ' is-empty'}`}>
                    {g ? (
                      <span className={`sl-row__club${g.right ? ' is-right' : ''}`}>
                        {g.club ? <Crest q={q(g.club)} /> : null}
                        <span>{g.club ? name(g.club) : 'Out of time'}</span>
                        <b aria-label={g.right ? 'right' : 'wrong'}>{g.right ? '✓' : '✕'}</b>
                      </span>
                    ) : <span className="sl-row__n">{i + 1}</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
