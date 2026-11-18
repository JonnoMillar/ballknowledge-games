'use client';
import { useEffect, useState } from 'react';
import RunClock from '../../../components/run/RunClock';
import { loadItems, saveItems } from '../../../src/lib/run/progress';
import { SEASON_PICK_MS, type RunTaskProps } from '../../../src/lib/run/tasks';
import Chart from '../components/Chart';
import { Clue, Crest } from '../components/Clue';
import { INK, seasonLabel } from '../lib/clubs';
import { RUN_GUESSES, SEASON_PICKS, runScore } from '../lib/run';
import type { RunSeasonView } from '../server';

/**
 * Read the season: the run's own board a day (games/season-line/data/run.json).
 * The whole line from the start, a five-season window; name the club in
 * three guesses (a squad player after one miss, the top scorer after two),
 * then pick the season in two goes (a miss says earlier or later). A clock a
 * guess, a shorter one for each season pick. The daily is untouched, so the
 * guesses live in the run's record.
 */
type State = { clubs: string[]; seasons?: (number | null)[] };
/** Records saved before the season had two goes held one pick. */
const migrate = (s: State & { season?: number | null }): State =>
  s.season !== undefined && !s.seasons ? { clubs: s.clubs, seasons: [s.season] } : s;

const post = (date: string, s: State) => fetch('/api/season-line/run', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, ...s }),
}).then((r) => (r.ok ? (r.json() as Promise<RunSeasonView>) : null), () => null);

export default function SeasonRunTask({ date, def, next, onDone }: RunTaskProps) {
  const [state, setState] = useState<State>(() => migrate(loadItems<State>(date, 'season') ?? { clubs: [] }));
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
  const seasons = state.seasons ?? [];
  const tried = new Set(v.picks.map((p) => p.picked));
  const lastDir = v.picks.at(-1)?.dir ?? null;
  const years = Array.from({ length: v.window[1] - v.window[0] + 1 }, (_, i) => v.window[0] + i);
  const name = (c: string) => v.clubs.find((x) => x.club === c)?.name ?? c;
  const q = (c: string) => v.clubs.find((x) => x.club === c)?.q ?? null;
  const me = { q: v.club?.q ?? null, colour: v.club?.colour ?? INK, name: v.club?.name };

  function finish() {
    const score = runScore(v.clubAt, v.season!.at);
    onDone({
      score,
      ...(v.clubAt === 1 && v.season!.at === 1 ? { find: `First guess: ${v.club!.name} ${seasonLabel(v.season!.start)}`, findScore: 100 } : {}),
    });
  }

  return (
    <div className="sl run-task run-season">
      {!clubDone
        ? <RunClock key={`c${state.clubs.length}`} ms={(def.clockMs)} running={!busy} onEnd={() => void send({ clubs: [...state.clubs, club] })} />
        : !done
          ? <RunClock key={`s${v.picks.length}`} ms={SEASON_PICK_MS} running={!busy} onEnd={() => void send({ ...state, seasons: [...seasons, null] })} />
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
                <p className="run-season__ask" aria-live="polite">
                  {v.picks.length === 0 ? 'Which season?'
                    : v.picks.at(-1)!.picked === null ? `Out of time. ${SEASON_PICKS - v.picks.length} more go.`
                      : <>Not {seasonLabel(v.picks.at(-1)!.picked!)}. <b>{lastDir === 'earlier' ? '◀ Earlier' : 'Later ▶'}</b>, last go.</>}
                </p>
                <div className="run-season__years">
                  {years.map((y) => {
                    const out = tried.has(y) || v.picks.some((p) => p.picked !== null && (p.dir === 'earlier' ? y >= p.picked : y <= p.picked));
                    return <button key={y} type="button" className={`lobby-quiet lobby-small${out ? ' is-out' : ''}`} disabled={busy || out} onClick={() => void send({ ...state, seasons: [...seasons, y] })}>{seasonLabel(y)}</button>;
                  })}
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
                  {v.season!.at === 1 ? 'Season spot on' : v.season!.at === 2 ? 'Season on the second go' : v.season!.picked === null ? 'Out of time on the season' : `You said ${seasonLabel(v.season!.picked)}`}
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
