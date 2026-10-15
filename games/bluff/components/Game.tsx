'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Pitch, { type Mark } from './Pitch';
import Swap from './Swap';
import { buildIndex, type SearchIndex } from '../../../src/lib/search/index';
import { decodeNames, type NameEntry, type NameRow } from '../../../src/lib/chain/client';
import { smooth } from '../../../src/lib/motion';
import {
  LIVES, dealt, guessed, nextRound, planted, rematch, sameAt, sheet, slotAt, suggestions, uncovered,
  type At, type Match,
} from '../lib/match';
import type { Named, Side } from '../lib/types';
import { readMatch, writeMatch } from '../lib/store';

const HOME = '/odd-man-out';

/**
 * The phone on the table. The front page starts the match; it lives here
 * and in localStorage, so a refresh keeps the lives. Each round: the faker
 * plants, the phone is covered and passed, the guesser taps, the reveal.
 * One red button on every screen. See games/bluff/HANDOFF.md.
 */
export default function Game() {
  const [match, setMatch] = useState<Match | null>(null);
  const [index, setIndex] = useState<SearchIndex<NameEntry> | null>(null);
  // The faker's choice, and the guesser's, before they commit.
  const [at, setAt] = useState<At | null>(null);
  const [fake, setFake] = useState<Named | null>(null);
  const [pick, setPick] = useState<At | null>(null);
  const [shake, setShake] = useState<At | null>(null);
  const [failed, setFailed] = useState(false);
  const dealing = useRef(false);

  useEffect(() => {
    const m = readMatch();
    if (!m) { location.replace(HOME); return; }
    setMatch(m);
  }, []);
  useEffect(() => { if (match) writeMatch(match); }, [match]);

  // Every name, once, for the faker's search.
  useEffect(() => {
    let live = true;
    fetch('/api/names')
      .then((r) => r.json())
      .then((j: { players: NameRow[] }) => { if (live) setIndex(buildIndex(decodeNames(j.players))); })
      .catch(() => { /* the field says it is not ready */ });
    return () => { live = false; };
  }, []);

  // A round that wants a side gets one.
  useEffect(() => {
    if (!match || match.phase !== 'deal' || dealing.current) return;
    dealing.current = true;
    setFailed(false);
    fetch('/api/odd-man-out/deal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: match.options.from, to: match.options.to, exclude: match.seen }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<Side>) : Promise.reject(new Error(String(r.status)))))
      .then((side) => go((m) => dealt(m, side)))
      .catch(() => setFailed(true))
      .finally(() => { dealing.current = false; });
  }, [match]);

  // Each round and each screen starts clean.
  const roundKey = match ? `${match.round.no}:${match.phase}` : '';
  useEffect(() => { setAt(null); setFake(null); setPick(null); }, [roundKey]);

  const side = match?.round.side ?? null;
  const helpFor = useMemo(
    () => (side && at && match?.options.help ? suggestions(side, at) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [side?.key, at?.[0], at?.[1], match?.options.help],
  );

  /** Every screen change glides (no teleports). */
  function go(f: (m: Match) => Match) {
    void smooth(() => setMatch((m) => (m ? f(m) : m)));
  }
  const leave = () => { writeMatch(null); location.assign(HOME); };

  if (!match) return <div className="bf-loading" aria-busy>…</div>;

  const { round, players, phase } = match;
  const bluffer = players[round.bluffer]!.name;
  const guesser = players[round.guesser]!.name;

  const guess = () => {
    if (!pick || !round.plant) return;
    if (!sameAt(pick, round.plant.at)) {
      setShake(pick);
      setTimeout(() => setShake(null), 420);
    }
    setPick(null);
    go((m) => guessed(m, pick));
  };

  let body: ReactNode;
  if (phase === 'deal' || !side) {
    body = (
      <div className="bf-card bf-card--wait vt" aria-busy={!failed}>
        {failed ? (
          <>
            <p>Couldn’t get a team sheet.</p>
            <button type="button" className="lobby-play display" onClick={() => setMatch((m) => (m ? { ...m } : m))}>Try again</button>
          </>
        ) : <p>Finding a team sheet…</p>}
      </div>
    );
  } else if (phase === 'plant') {
    const shown = at && fake ? sheet(side, { at, fake }) : side.lines;
    const mark = (s: At): Mark => (at && sameAt(s, at) ? (fake ? 'swapped' : 'picked') : null);
    body = (
      <>
        <Ask head={`${bluffer}, plant a fake`} sub={`${guesser}, look away.`} />
        <Sheet side={side} />
        <Pitch lines={shown} mark={mark} onTap={(s) => { setAt(s); setFake(null); }} />
        {at ? (
          <Swap side={side} slot={slotAt(side, at)!} help={helpFor} index={index} chosen={fake} onChoose={setFake} />
        ) : <p className="bf-hint vt">Tap the player to take out.</p>}
        <button type="button" className="lobby-play display vt" disabled={!at || !fake} onClick={() => at && fake && go((m) => planted(m, at, fake))}>
          Pass the phone
        </button>
      </>
    );
  } else if (phase === 'cover') {
    body = (
      <div className="bf-card bf-cover vt">
        <p className="bf-cover__to">Hand the phone to</p>
        <p className="bf-cover__name display">{guesser}</p>
        <button type="button" className="lobby-play display" onClick={() => go(uncovered)}>I’m {guesser}</button>
      </div>
    );
  } else {
    const plant = round.plant!;
    const done = phase === 'reveal';
    const mark = (s: At): Mark => {
      if (done && sameAt(s, plant.at)) return round.caught ? 'caught' : 'fake';
      if (round.wrong.some((w) => sameAt(w, s))) return 'real';
      if (!done && pick && sameAt(s, pick)) return 'picked';
      return null;
    };
    const real = slotAt(side, plant.at)!;
    const left = LIVES_LEFT(match);
    body = (
      <>
        {done ? (
          <Ask
            head={round.caught ? `${guesser} spotted it` : `${bluffer} got away with it`}
            sub={`${plant.fake.name} was the fake. ${real.name} played.`}
          />
        ) : (
          <Ask
            head={`${guesser}, find the fake`}
            sub={round.wrong.length ? `Real. ${left === 1 ? 'Last life.' : 'Go again.'}` : 'Tap the one who wasn’t there.'}
          />
        )}
        <Sheet side={side} />
        <Pitch lines={sheet(side, plant)} mark={mark} onTap={done ? null : setPick} shake={shake} />
        {!done ? (
          <button type="button" className="lobby-play display vt" disabled={!pick} onClick={guess}>That’s the fake</button>
        ) : match.winner !== null ? (
          <div className="bf-full vt">
            <p className="bf-full__head display">{players[match.winner]!.name} wins</p>
            <button type="button" className="lobby-play display" onClick={() => go(rematch)}>Rematch</button>
            <button type="button" className="bf-quiet" onClick={leave}>New game</button>
          </div>
        ) : (
          <button type="button" className="lobby-play display vt" onClick={() => go(nextRound)}>Next round</button>
        )}
      </>
    );
  }

  return (
    <>
      <Board match={match} />
      {body}
      <footer className="bf-foot">
        <button type="button" className="bf-quiet" onClick={() => { if (confirm('Abandon this match?')) leave(); }}>Abandon match</button>
      </footer>
    </>
  );
}

const LIVES_LEFT = (m: Match) => m.players[m.round.guesser]!.lives;

function Ask({ head, sub }: { head: string; sub: string }) {
  return (
    <header className="bf-ask vt">
      <h1 className="bf-ask__head display">{head}</h1>
      <p className="bf-ask__sub">{sub}</p>
    </header>
  );
}

/** The match it is from: both players need it, so it's no clue. */
function Sheet({ side }: { side: Side }) {
  const year = side.date.slice(0, 4);
  const comp = /\d{4}/.test(side.comp) ? side.comp : `${side.comp} ${year}`;
  return (
    <p className="bf-sheet vt">
      <b>{side.team}</b> {side.score ?? 'v'} {side.opponent}
      <span className="bf-sheet__comp">{comp} · {side.formation}</span>
    </p>
  );
}

/** Names and lives; whose round it is. */
function Board({ match }: { match: Match }) {
  const { round, phase } = match;
  return (
    <ol className="bf-board">
      {match.players.map((p, i) => {
        const role = phase === 'reveal' ? null : i === round.bluffer ? 'faking' : i === round.guesser ? 'guessing' : null;
        return (
          <li key={i} className={`bf-board__p${p.lives === 0 ? ' is-out' : ''}${role ? ' is-up' : ''}`}>
            <span className="bf-board__name display">{p.name}</span>
            <span className="bf-lives" aria-label={`${p.lives} of ${LIVES} lives`}>
              {Array.from({ length: LIVES }, (_, k) => <i key={k} className={k < p.lives ? 'is-on' : ''} />)}
            </span>
            {role ? <span className="bf-board__role">{role}</span> : p.lives === 0 ? <span className="bf-board__role">out</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
