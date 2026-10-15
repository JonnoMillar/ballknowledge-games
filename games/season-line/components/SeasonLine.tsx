'use client';
import { useEffect, useRef, useState } from 'react';
import Back from '../../../components/Back';
import { crestPath } from '../../../src/lib/clubs';
import { localDate } from '../../../src/lib/daily';
import { smooth } from '../../../src/lib/motion';
import { markDone } from '../../../src/lib/today';
import { seasonLabel } from '../lib/clubs';
import { loadGuesses, markSeen, saveGuesses, seenEndless, shareLine } from '../lib/progress';
import { GUESSES, type BoardView, type Guess } from '../lib/types';
import Chart from './Chart';

/**
 * One board: the line, the hints so far, the guesses, and the guess box.
 * The daily is the player's own date; `?from=&to=` deals an endless board
 * in those years. Every guess goes to /api/season-line/board, which sends
 * back what the page may now see; the answer only once it is over.
 */
const post = (id: string, guesses: Guess[]) => fetch('/api/season-line/board', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, guesses }),
}).then((r) => (r.ok ? (r.json() as Promise<BoardView>) : null));

export default function SeasonLine() {
  const [board, setBoard] = useState<{ view: BoardView; guesses: Guess[] } | null | undefined>(undefined);
  const [endless, setEndless] = useState<[number, number] | null>(null);
  const deal = useRef(0);

  async function open() {
    const q = new URLSearchParams(location.search);
    const from = Number(q.get('from')), to = Number(q.get('to'));
    let id = localDate();
    if (q.has('from')) {
      setEndless([from, to]);
      const r = await fetch(`/api/season-line/endless?from=${from}&to=${to}&seen=${seenEndless().join(',')}`);
      const got = r.ok ? ((await r.json()) as { id: string }).id : null;
      if (!got) { setBoard(null); return; }
      id = got;
      markSeen(id);
    }
    const guesses = loadGuesses(id);
    const view = await post(id, guesses).catch(() => null);
    const n = ++deal.current;
    await smooth(() => { if (n === deal.current) setBoard(view ? { view, guesses } : null); });
  }
  useEffect(() => { void open(); }, []);

  const title = board?.view.day ? `Season line #${board.view.day}` : 'Season line';
  return (
    <div className="app sl">
      <header className="masthead">
        <Back href="/season-line" label="Season line" />
        <a className="masthead__brand display" href="/season-line">Season line</a>
        <div className="masthead__meta">{board ? <span>{board.view.day ? `#${board.view.day}` : 'Endless'}</span> : null}</div>
      </header>
      <main className="sl__main">
        {board === undefined ? <div className="sl-card sl-card--wait" aria-hidden /> : board === null ? (
          <p className="sl__none">{endless ? 'Every board in those years played. Try a wider range.' : 'No board today. Back tomorrow.'}</p>
        ) : (
          <Board key={board.view.id} start={board} title={title} onNext={endless ? () => { setBoard(undefined); void open(); } : null} />
        )}
      </main>
    </div>
  );
}

function Board({ start, title, onNext }: { start: { view: BoardView; guesses: Guess[] }; title: string; onNext: (() => void) | null }) {
  const [view, setView] = useState(start.view);
  const [guesses, setGuesses] = useState(start.guesses);
  const [drawn, setDrawn] = useState(start.view.line.length);
  const locked = view.judged.find((j) => j.clubRight)?.club ?? null;
  const [club, setClub] = useState<string>('');
  const [season, setSeason] = useState<string>('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const pick = locked ?? club;
  const seasons = pick ? view.clubs.find((c) => c.club === pick)!.seasons : [];
  const tried = view.judged.some((j) => j.club === pick && String(j.start) === season);

  useEffect(() => { if (view.done && view.date) markDone('season-line', view.date); }, [view.done, view.date]);
  // A season that the chosen club never played in the PL is not on offer.
  useEffect(() => { if (season && !seasons.includes(Number(season))) setSeason(''); }, [pick]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guess() {
    if (!pick || !season || pending || tried || view.done) return;
    setPending(true);
    const next = [...guesses, { club: pick, start: Number(season) }];
    const v = await post(view.id, next).catch(() => null);
    setPending(false);
    if (!v) return;
    saveGuesses(view.id, next);
    setDrawn(view.line.length);
    await smooth(() => { setGuesses(next); setView(v); setSeason(''); });
  }

  async function share() {
    const text = shareLine(title, view.judged, view.won);
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text }).catch(() => {});
    else { await navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); }
  }

  const name = (c: string) => view.clubs.find((x) => x.club === c)?.name ?? c;
  const q = (c: string) => view.clubs.find((x) => x.club === c)?.q ?? null;
  const hints: { k: string; label: string; value: string }[] = [
    ...view.hints.squad.map((s, i) => ({ k: `squad${i}`, label: 'In the squad', value: s })),
    ...(view.rival ? [{ k: 'rival', label: 'Second line', value: view.rival.name }] : []),
    ...(view.hints.top ? [{ k: 'top', label: 'Top scorer', value: `${view.hints.top.names.join(' & ')}, ${view.hints.top.goals}` }] : []),
  ];
  // In the order they arrived: squad, rival, squad, top.
  const order = ['squad0', 'rival', 'squad1', 'top'];
  hints.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));

  return (
    <>
      <section className="sl-card sl-stage">
        {view.done && view.answer ? (
          <div className="sl-answer vt">
            <img className="sl-answer__crest" src={q(view.answer.club) ? crestPath(q(view.answer.club)!) : ''} alt="" width={56} height={56} />
            <div>
              <p className="sl-answer__name display">{view.answer.name} <span>{seasonLabel(view.answer.start)}</span></p>
              <p className="sl-answer__champ">
                {view.answer.champion === view.answer.club ? 'Champions that year' : `Champions: ${view.answer.championName}`}
              </p>
            </div>
          </div>
        ) : (
          <p className="sl-stage__ask display vt">Whose season? <span>{view.line.length} of {view.games} games</span></p>
        )}
        <Chart games={view.games} teams={view.teams} line={view.line} from={drawn} rival={view.rival && { name: view.rival.club, line: view.rival.line }} />
        {hints.length ? (
          <ul className="sl-hints">
            {hints.map((h) => <li key={h.k} className="sl-hint vt"><span>{h.label}</span><b>{h.value}</b></li>)}
          </ul>
        ) : null}
      </section>

      <section className="sl-card sl-guesses" aria-label="Guesses">
        <ol className="sl-rows">
          {Array.from({ length: GUESSES }, (_, i) => {
            const j = view.judged[i];
            return (
              <li key={i} className={`sl-row${j ? '' : ' is-empty'}`}>
                {j ? (
                  <>
                    <span className={`sl-row__club${j.clubRight ? ' is-right' : ''}`}>
                      {q(j.club) ? <img src={crestPath(q(j.club)!)} alt="" width={22} height={22} /> : null}
                      {name(j.club)}
                    </span>
                    <span className={`sl-row__season${j.season === 0 ? ' is-right' : ''}`}>
                      {seasonLabel(j.start)}
                      {j.season === 0 ? null : <i aria-label={j.season > 0 ? 'later' : 'earlier'}>{j.season > 0 ? '▲' : '▼'}</i>}
                    </span>
                  </>
                ) : <span className="sl-row__n">{i + 1}</span>}
              </li>
            );
          })}
        </ol>

        {view.done ? (
          <div className="sl-end vt">
            <p className="sl-end__verdict display">{view.won ? (view.judged.length === 1 ? 'First time' : `Got it in ${view.judged.length}`) : 'Not this time'}</p>
            <div className="sl-end__go">
              {onNext ? (
                <>
                  <button type="button" className="lobby-play display" onClick={onNext}>Next season</button>
                  <button type="button" className="sl-quiet" onClick={share}>{copied ? 'Copied' : 'Share'}</button>
                </>
              ) : (
                <>
                  <button type="button" className="lobby-play display" onClick={share}>{copied ? 'Copied' : 'Share'}</button>
                  <a className="sl-quiet" href="/season-line#endless">Endless</a>
                </>
              )}
            </div>
          </div>
        ) : (
          <form className="sl-form vt" onSubmit={(e) => { e.preventDefault(); void guess(); }}>
            {locked ? (
              <span className="sl-locked">
                {q(locked) ? <img src={crestPath(q(locked)!)} alt="" width={22} height={22} /> : null}
                <span>{name(locked)}</span>
              </span>
            ) : (
              <select className="sl-select" aria-label="Club" value={club} onChange={(e) => setClub(e.target.value)}>
                <option value="" disabled>Club</option>
                {view.clubs.map((c) => <option key={c.club} value={c.club}>{c.name}</option>)}
              </select>
            )}
            <select className="sl-select" aria-label="Season" value={season} onChange={(e) => setSeason(e.target.value)} disabled={!pick}>
              <option value="" disabled>Season</option>
              {[...seasons].reverse().map((s) => <option key={s} value={s}>{seasonLabel(s)}</option>)}
            </select>
            <button type="submit" className="lobby-play display sl-form__go" disabled={!pick || !season || pending || tried}>
              {tried ? 'Tried' : 'Guess'}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
