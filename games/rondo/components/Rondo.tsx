'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import BallView from './BallView';
import LossCard from './LossCard';
import PassBox from './PassBox';
import Scoreboard from './Scoreboard';
import { buildIndex, type SearchIndex } from '../../../src/lib/search/index';
import { decodeNames, type NameEntry, type NameRow } from '../../../src/lib/chain/client';
import {
  dealt, lost, nextBall, passed, rematch, winner,
  type Carrier, type Match,
} from '../lib/match';
import type { PassResponse } from '../lib/wire';
import { readMatch, writeMatch } from '../lib/store';

/**
 * Rondo: the phone on the table.
 *
 * The front page starts the match; it lives here and in localStorage
 * (`lib/store`), so a knocked phone or a refresh does not lose the score.
 * The server deals the starter and judges every pass; this component runs
 * the clock, the turn, and the cards. See games/rondo/DESIGN.md.
 */

export default function Rondo() {
  const [match, setMatch] = useState<Match | null>(null);
  const [index, setIndex] = useState<SearchIndex<NameEntry> | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const dealing = useRef(false);

  // Memory: the match in progress. None means the front page starts one.
  useEffect(() => {
    const m = readMatch();
    if (!m) { location.replace('/rondo'); return; }
    setMatch(m);
  }, []);
  useEffect(() => {
    if (match) writeMatch(match);
  }, [match]);
  const leave = () => { writeMatch(null); location.assign('/rondo'); };

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

  if (!match) return <div className="rondo__loading" aria-busy>…</div>;

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
          onNewGame={leave}
        />
      ) : null}

      <footer className="rondo__foot">
        <button type="button" className="lobby-quiet lobby-small" onClick={() => { if (confirm('Leave this match?')) leave(); }}>
          Leave match
        </button>
      </footer>
    </>
  );
}
