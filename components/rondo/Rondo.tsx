'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import BallView from './BallView';
import LossCard from './LossCard';
import PassBox from './PassBox';
import Scoreboard from './Scoreboard';
import Setup from './Setup';
import { buildIndex, type SearchIndex } from '../../src/lib/search/index';
import { decodeNames, type NameEntry, type NameRow } from '../../src/lib/chain/client';
import {
  dealt, lost, newMatch, nextBall, passed, rematch, winner,
  type Carrier, type Clock, type Match,
} from '../../src/lib/rondo/match';
import type { PassResponse } from '../../src/lib/rondo/wire';

/**
 * Rondo: the phone on the table.
 *
 * The match lives here and in localStorage, so a knocked phone or a
 * refresh does not lose the score. The server deals the starter and
 * judges every pass; this component runs the clock, the turn, and the
 * cards. See docs/superpowers/specs/2026-09-20-rondo-design.md.
 */

const MATCH_KEY = 'rondo.match.v1';
const NAMES_KEY = 'rondo.names.v1';

interface Saved { names: string[]; clock: Clock }

function readMatch(): Match | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Match;
    return Array.isArray(m.players) && m.players.length >= 2 ? m : null;
  } catch { return null; }
}
function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch { /* fresh */ }
  return { names: [], clock: 30 };
}

export default function Rondo() {
  const [match, setMatch] = useState<Match | null>(null);
  const [saved, setSaved] = useState<Saved>({ names: [], clock: 30 });
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState<SearchIndex<NameEntry> | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const dealing = useRef(false);

  // Memory: the match in progress, and the last names used.
  useEffect(() => {
    setMatch(readMatch());
    setSaved(readSaved());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      if (match) localStorage.setItem(MATCH_KEY, JSON.stringify(match));
      else localStorage.removeItem(MATCH_KEY);
    } catch { /* a full or private store; the game still plays */ }
  }, [match, ready]);

  // The album index, once. Names only.
  useEffect(() => {
    let live = true;
    fetch('/api/names')
      .then((r) => r.json())
      .then((j: { players: NameRow[] }) => { if (live) setIndex(buildIndex(decodeNames(j.players))); })
      .catch(() => { /* the field says the ref is not ready */ });
    return () => { live = false; };
  }, []);

  // Deal whenever a match wants a ball and has none.
  useEffect(() => {
    if (!match || match.over || match.carrier || match.loss || dealing.current) return;
    dealing.current = true;
    fetch('/api/rondo/deal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ exclude: match.starters }) })
      .then((r) => r.json())
      .then((starter: Carrier) => setMatch((m) => (m && !m.carrier && !m.over ? dealt(m, starter) : m)))
      .finally(() => { dealing.current = false; });
  }, [match]);

  const live = !!match && !!match.carrier && !match.loss && !match.over;
  const passKey = match ? `${match.ballNo}:${match.named.length}` : '';

  // The clock: set at the start of every pass, ticking while the pass is live.
  useEffect(() => {
    if (!live || !match || match.clock === 0 || !index) { setDeadline(null); return; }
    setDeadline(Date.now() + match.clock * 1000);
    setNow(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, passKey, match?.clock, index]);
  useEffect(() => {
    if (deadline === null) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [deadline]);
  const secondsLeft = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));

  const judge = useCallback(async (target: string | null, reason: 'time' | 'forfeit' | 'pass') => {
    if (!match || !match.carrier || busy) return;
    setBusy(true);
    setDeadline(null);
    try {
      const res = await fetch('/api/rondo/pass', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ carrier: match.carrier.id, burnt: match.burnt, named: match.named, target }),
      });
      const out = (await res.json()) as PassResponse;
      if (out.ok) {
        setMatch((m) => (m ? passed(m, out.carrier, out.via, out.burnt, out.clubs) : m));
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 400);
        const why = out.reason === 'forfeit' && reason === 'time' ? 'time' : out.reason;
        setTimeout(() => {
          setMatch((m) => (m ? lost(m, { reason: why, open: out.open, ...(out.via ? { via: out.via } : {}), ...(out.target ? { target: out.target } : {}) }, out.clubs) : m));
        }, 380);
      }
    } catch {
      // The ref is unreachable: give the clock back rather than a bib.
      if (match.clock > 0) setDeadline(Date.now() + 10_000);
    } finally {
      setBusy(false);
    }
  }, [match, busy]);

  // Time.
  useEffect(() => {
    if (secondsLeft === 0 && live && !busy) void judge(null, 'time');
  }, [secondsLeft, live, busy, judge]);

  const start = (names: string[], clock: Clock) => {
    const s = { names, clock };
    setSaved(s);
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(s)); } catch { /* fine */ }
    setMatch(newMatch(names, clock));
  };

  if (!ready) return <div className="rondo__loading" aria-busy>…</div>;

  if (!match) {
    return (
      <>
        <Setup initialNames={saved.names} initialClock={saved.clock} onStart={start} />
        <HowToPlay />
      </>
    );
  }

  const current = match.players[match.turn]!;
  const taken = new Set(match.named);

  return (
    <>
      <Scoreboard players={match.players} turn={match.turn} live={live} />

      {match.carrier ? (
        <BallView
          carrier={match.carrier}
          trail={match.trail}
          burnt={match.burnt}
          clubs={match.clubs}
          shake={shake}
          ballNo={match.ballNo}
        />
      ) : (
        <div className="ball ball--dealing" aria-busy>
          <span className="ball__kickoff">Ball {match.ballNo + 1} · the ref picks someone…</span>
        </div>
      )}

      {live ? (
        <PassBox
          who={current.name}
          passKey={passKey}
          index={index}
          secondsLeft={secondsLeft}
          clock={match.clock}
          busy={busy}
          taken={taken}
          onPass={(id) => void judge(id, 'pass')}
          onGiveUp={() => void judge(null, 'forfeit')}
        />
      ) : null}

      {match.loss ? (
        <LossCard
          loss={match.loss}
          players={match.players}
          clubs={match.clubs}
          over={match.over}
          winnerIndex={winner(match)}
          onNext={() => setMatch((m) => (m ? nextBall(m) : m))}
          onRematch={() => setMatch((m) => (m ? rematch(m) : m))}
          onNewGame={() => setMatch(null)}
        />
      ) : null}

      <footer className="rondo__foot">
        <button type="button" className="rondo__abandon" onClick={() => { if (confirm('Abandon this match?')) setMatch(null); }}>
          Abandon match
        </button>
      </footer>
    </>
  );
}

function HowToPlay() {
  return (
    <section className="how">
      <h2 className="how__title display">How it goes</h2>
      <ol className="how__rules">
        <li><b>Someone's on the ball.</b> Pass to a player who shared a club with them. Say it, then type it — the phone's the ref.</li>
        <li><b>Every club a pass goes through is burnt</b> for the rest of the ball. No club twice, no player twice. The big clubs go first, and it gets harder every touch.</li>
        <li><b>Can't find one? You've lost it.</b> Take a bib. A pass nobody could take on is a dead end — that's your bib too.</li>
        <li><b>Three bibs and you're in the middle.</b> Last one standing keeps the ball.</li>
      </ol>
      <p className="how__note">
        The album is the ref: 11,741 players and every club Wikidata says they played for, from 1992 on.
        If the ref doesn't know them, they don't count — and the ref never shows the open clubs while the ball's live.
      </p>
    </section>
  );
}
