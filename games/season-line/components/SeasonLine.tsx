'use client';
import { useEffect, useRef, useState } from 'react';
import Back from '../../../components/Back';
import { crestPath } from '../../../src/lib/clubs';
import { localDate } from '../../../src/lib/daily';
import { smooth } from '../../../src/lib/motion';
import { markDone } from '../../../src/lib/today';
import { INK, seasonLabel } from '../lib/clubs';
import { loadGuesses, markSeen, saveGuesses, seenEndless, shareLine } from '../lib/progress';
import { GUESSES, type BoardView, type Guess } from '../lib/types';
import Chart from './Chart';

/**
 * One board: the line, the clues, the guess box and the guesses so far.
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

/** A clue's glyph: a shirt for the squad player, a ball for the top scorer. */
const Glyph = ({ kind }: { kind: 'squad' | 'top' }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
    {kind === 'squad'
      ? <path d="M8.5 3.5 3 6l2 4.5 2.5-1V20.5h9V9.5l2.5 1L21 6l-5.5-2.5a3.5 3.5 0 0 1-7 0Z" />
      : <><circle cx="12" cy="12" r="9" /><path d="m12 8 3.4 2.5-1.3 4h-4.2l-1.3-4Z" /><path d="M12 8V3.2M15.4 10.5l4.4-1.6M14.1 14.5l2.7 3.7M9.9 14.5l-2.7 3.7M8.6 10.5 4.2 8.9" /></>}
  </svg>
);

/** A clue: a grey missing-sticker slot until a miss earns it, then a card stuck down. */
function Clue({ kind, label, name, note }: { kind: 'squad' | 'top'; label: string; name: string | null; note?: string }) {
  return name ? (
    <li className="sl-clue is-on">
      <span className="sl-clue__glyph"><Glyph kind={kind} /></span>
      <span className="sl-clue__label">{label}</span>
      <b className="sl-clue__name display">{name}</b>
      {note ? <span className="sl-clue__note">{note}</span> : null}
    </li>
  ) : (
    <li className="sl-clue" aria-label={`${label}, not yet`}>
      <span className="sl-clue__glyph"><Glyph kind={kind} /></span>
      <span className="sl-clue__label">{label}</span>
    </li>
  );
}

const Crest = ({ q, size = 22 }: { q: string | null; size?: number }) => (q ? <img src={crestPath(q)} alt="" width={size} height={size} /> : null);

function Board({ start, title, onNext }: { start: { view: BoardView; guesses: Guess[] }; title: string; onNext: (() => void) | null }) {
  const [view, setView] = useState(start.view);
  const [guesses, setGuesses] = useState(start.guesses);
  const locked = view.judged.find((j) => j.clubRight)?.club ?? null;
  const [club, setClub] = useState<string>('');
  const [season, setSeason] = useState<string>('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const pick = locked ?? club;
  const tried = view.judged.some((j) => j.club === pick && String(j.start) === season);
  const years = Array.from({ length: view.range[1] - view.range[0] + 1 }, (_, i) => view.range[1] - i);

  useEffect(() => { if (view.done && view.date) markDone('season-line', view.date); }, [view.done, view.date]);

  async function guess() {
    if (!pick || !season || pending || tried || view.done) return;
    setPending(true);
    const next = [...guesses, { club: pick, start: Number(season) }];
    const v = await post(view.id, next).catch(() => null);
    setPending(false);
    if (!v) return;
    saveGuesses(view.id, next);
    await smooth(() => { setGuesses(next); setView(v); });
  }

  async function share() {
    const text = shareLine(title, view.judged, view.won);
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text }).catch(() => {});
    else { await navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); }
  }

  const info = (c: string) => view.clubs.find((x) => x.club === c);
  const name = (c: string) => info(c)?.name ?? c;
  const q = (c: string) => info(c)?.q ?? null;
  // The hidden club is a question mark until it is named (or the board is over).
  const known = view.answer?.club ?? locked;
  const me = { q: known ? q(known) : null, colour: known ? (info(known)?.colour ?? INK) : INK };

  return (
    <div className="sl-play">
      <section className="sl-card sl-chartcard" aria-label="The season">
        <Chart games={view.games} teams={view.teams} line={view.line} me={me} rivals={view.rivals} />
      </section>

      <div className="sl-side">
        <ul className="sl-clues" aria-label="Clues">
          <Clue kind="squad" label="Squad" name={view.hints.squad} />
          <Clue kind="top" label="Top scorer" name={view.hints.top ? view.hints.top.names.join(' & ') : null} note={view.hints.top ? `${view.hints.top.goals} goals` : undefined} />
        </ul>

        <section className="sl-card sl-guesses" aria-label="Guesses">
          {view.done && view.answer ? (
            <div className="sl-end vt">
              <div className="sl-answer">
                <Crest q={view.answer.q} size={56} />
                <div>
                  <p className="sl-answer__name display">{view.answer.name} <span>{seasonLabel(view.answer.start)}</span></p>
                  <p className="sl-answer__champ">{view.answer.champion === view.answer.club ? 'Champions' : `Champions: ${view.answer.championName}`}</p>
                </div>
              </div>
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
                  <Crest q={q(locked)} size={24} />
                  <span>{name(locked)}</span>
                </span>
              ) : (
                <select className="sl-select" aria-label="Club" value={club} onChange={(e) => setClub(e.target.value)}>
                  <option value="" disabled>Club</option>
                  {view.clubs.map((c) => <option key={c.club} value={c.club}>{c.name}</option>)}
                </select>
              )}
              <select className="sl-select" aria-label="Season" value={season} onChange={(e) => setSeason(e.target.value)}>
                <option value="" disabled>Season</option>
                {years.map((s) => <option key={s} value={s}>{seasonLabel(s)}</option>)}
              </select>
              <button type="submit" className="lobby-play display sl-form__go" disabled={!pick || !season || pending || tried}>
                {tried ? 'Tried' : 'Guess'}
              </button>
            </form>
          )}

          <ol className="sl-rows">
            {Array.from({ length: GUESSES }, (_, i) => {
              const j = view.judged[i];
              return (
                <li key={i} className={`sl-row${j ? '' : ' is-empty'}`}>
                  {j ? (
                    <>
                      <span className={`sl-row__club${j.clubRight ? ' is-right' : ''}`}>
                        <Crest q={q(j.club)} />
                        <span>{name(j.club)}</span>
                      </span>
                      <span className={`sl-row__season${j.season === 0 ? ' is-right' : ''}`}>
                        {seasonLabel(j.start)}
                        {j.season === 0 ? null : <i className={j.season > 0 ? 'is-up' : 'is-down'} aria-label={j.season > 0 ? 'later' : 'earlier'}>{j.season > 0 ? '▲' : '▼'}</i>}
                      </span>
                    </>
                  ) : <span className="sl-row__n">{i + 1}</span>}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
