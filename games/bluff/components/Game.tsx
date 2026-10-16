'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Pitch, { Name, type Mark } from './Pitch';
import Swap from './Swap';
import Help from './Help';
import Lives from './Lives';
import TeamBadge from './TeamBadge';
import { useCardDrag } from './useCardDrag';
import { buildIndex, type SearchIndex } from '../../../src/lib/search/index';
import { decodeNames, type NameEntry, type NameRow } from '../../../src/lib/chain/client';
import { smooth } from '../../../src/lib/motion';
import {
  dealt, groupAt, guessed, helpSet, nextRound, planted, rematch, sameAt, sheet, slotAt, uncovered,
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

  // A card dragged onto the pitch swaps that player out for it.
  const dnd = useCardDrag((to, p) => { setAt(to); setFake(p); });

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
  // The round's suggestions, drawn once so a group gets the same ones whichever of its players is tapped.
  const help = useMemo(
    () => (side && match?.options.help ? helpSet(side) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [side?.key, match?.round.no, match?.options.help],
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
        <Scoreline side={side} />
        <Pitch lines={shown} team={side.team} mark={mark} over={dnd.over} onTap={(s) => { setAt(s); setFake(null); }} />
        {help ? (
          <Help set={help} group={at ? groupAt(side, at) : null} chosen={fake} onChoose={setFake} grab={dnd.grab} />
        ) : null}
        {at ? (
          <Swap side={side} slot={slotAt(side, at)!} index={index} chosen={fake} onChoose={setFake} />
        ) : <p className="bf-hint vt">Tap the player to take out{help ? ', or drag a card onto them' : ''}.</p>}
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
      if (round.wrong.some((w) => sameAt(w, s))) return 'real';
      if (!done && pick && sameAt(s, pick)) return 'picked';
      return null;
    };
    const left = players[round.guesser]!.lives;
    body = (
      <>
        {done ? (
          <Ask head={round.caught ? `${guesser} spotted it` : `${bluffer} got away with it`} />
        ) : (
          <Ask
            head={`${guesser}, find the fake`}
            sub={round.wrong.length ? `Real. ${left === 1 ? 'Last life.' : 'Go again.'}` : 'Tap the one who wasn’t there.'}
          />
        )}
        <Scoreline side={side} />
        <Pitch
          lines={sheet(side, plant)}
          team={side.team}
          mark={mark}
          onTap={done ? null : setPick}
          shake={shake}
          reveal={done ? { at: plant.at, real: slotAt(side, plant.at)!, caught: round.caught } : null}
        />
        {!done ? (
          <button type="button" className="lobby-play display vt" disabled={!pick} onClick={guess}>That’s the fake</button>
        ) : match.winner !== null ? (
          <div className="bf-full vt">
            <p className="bf-full__head display">{players[match.winner]!.name} wins</p>
            <button type="button" className="lobby-play display" onClick={() => go(rematch)}>Rematch</button>
            <button type="button" className="bf-menu display" onClick={leave}>Back to main menu</button>
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
      {dnd.drag ? (
        <div className="bf-slot bf-slot--ghost" style={{ left: dnd.drag.x, top: dnd.drag.y, width: dnd.drag.w }} aria-hidden>
          <Name name={dnd.drag.p.name} />
        </div>
      ) : null}
    </>
  );
}

function Ask({ head, sub }: { head: string; sub?: string }) {
  return (
    <header className="bf-ask vt">
      <h1 className="bf-ask__head display">{head}</h1>
      {sub ? <p className="bf-ask__sub">{sub}</p> : null}
    </header>
  );
}

/** The match it is from, crest or flag each side: both players need it, so it's no clue. */
function Scoreline({ side }: { side: Side }) {
  const year = side.date.slice(0, 4);
  const comp = /\d{4}/.test(side.comp) ? side.comp : `${side.comp} ${year}`;
  return (
    <div className="bf-sheet vt">
      <span className="bf-sheet__team"><TeamBadge team={side.team} size={30} /><b>{side.team}</b></span>
      <span className="bf-sheet__score display">{side.score ?? 'v'}</span>
      <span className="bf-sheet__team bf-sheet__team--opp"><b>{side.opponent}</b><TeamBadge team={side.opponent} size={30} /></span>
      <span className="bf-sheet__comp">{comp} · {side.formation}</span>
    </div>
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
            <Lives lives={p.lives} />
            {role ? <span className="bf-board__role">{role}</span> : p.lives === 0 ? <span className="bf-board__role">out</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
