'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex, type SearchIndex } from '../../src/lib/search/index';
import { decodeNames, type NameEntry, type NameRow } from '../../src/lib/chain/client';
import {
  dealt, newMatch, next, out, phase, pitched, rematch, swung,
  type Match, type Pitch, type Settings, type Side, type Verdict,
} from '../../src/lib/slugger/match';
import Setup, { type SetupValue } from './Setup';
import Ballpark from './Ballpark';

/**
 * SLUGGER — the shell.
 *
 * Holds the match, talks to the umpire, and remembers the game across a
 * locked phone. The match itself is a pure value (src/lib/slugger/match.ts)
 * and every rule lives there; this component only moves it along: deal
 * when a deal is due, judge a swing when one is made, and put it away.
 */
// v2: the one-swing, three-up shape. A v1 game left on a phone is not read.
const MATCH_KEY = 'slugger.match.v2';
const SETUP_KEY = 'slugger.setup.v1';

const DEFAULT_SETUP: SetupValue = {
  settings: { innings: 3, clock: 30 },
  sides: [{ name: 'Away', lineup: [''] }, { name: 'Home', lineup: [''] }],
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* a private window */ }
}

export default function Slugger() {
  const [match, setMatch] = useState<Match | null>(null);
  const [setup, setSetup] = useState<SetupValue>(DEFAULT_SETUP);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState<SearchIndex<NameEntry> | null>(null);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const dealing = useRef(false);

  // Come back to the game the phone was locked on.
  useEffect(() => {
    const saved = read<Match>(MATCH_KEY);
    if (saved && (saved.status === 'live' || saved.status === 'over')) setMatch(saved);
    const s = read<SetupValue>(SETUP_KEY);
    if (s) setSetup(s);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (match) write(MATCH_KEY, match);
    else try { localStorage.removeItem(MATCH_KEY); } catch { /* fine */ }
  }, [match, ready]);

  // The album, once. Names only: nothing here ranks or lists a club.
  useEffect(() => {
    let live = true;
    fetch('/api/names')
      .then((r) => r.json() as Promise<{ players: NameRow[] }>)
      .then((j) => { if (live) setIndex(buildIndex(decodeNames(j.players))); })
      .catch(() => { if (live) setTrouble('The album would not load. Check the connection and reload.'); });
    return () => { live = false; };
  }, []);

  // A deal is due whenever there is no hand and no pitch at the plate.
  const dealDue = match !== null && phase(match) === 'deal';
  useEffect(() => {
    if (!dealDue || dealing.current) return;
    dealing.current = true;
    const pitchedSoFar = match!.pitched;
    fetch('/api/slugger/pitch', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pitched: pitchedSoFar }),
    })
      .then((r) => r.json() as Promise<{ hand: Pitch[] }>)
      .then((j) => setMatch((m) => (m && phase(m) === 'deal' ? dealt(m, j.hand) : m)))
      .catch(() => setTrouble('The pitcher dropped the ball. Check the connection and tap Retry.'))
      .finally(() => { dealing.current = false; });
  }, [dealDue, match]);

  const start = useCallback((v: SetupValue) => {
    setSetup(v);
    write(SETUP_KEY, v);
    setTrouble(null);
    setMatch(newMatch(v.settings, v.sides as [Side, Side]));
  }, []);

  const onPitch = useCallback((p: Pitch) => setMatch((m) => (m ? pitched(m, p) : m)), []);

  const onSwing = useCallback(async (entry: NameEntry) => {
    if (!match || phase(match) !== 'swing' || busy) return;
    // A name already hit never reaches the umpire: it is a foul here, and
    // the batter swings again.
    if (match.used.includes(entry.id)) {
      const foul: Verdict = { verdict: 'miss', player: { id: entry.id, name: entry.name }, clubs: [] };
      setMatch((m) => (m ? swung(m, foul) : m));
      return;
    }
    setBusy(true);
    setTrouble(null);
    try {
      const r = await fetch('/api/slugger/swing', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ club: match.pitch!.id, player: entry.id }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const v = (await r.json()) as Verdict;
      setMatch((m) => (m ? swung(m, v) : m));
    } catch {
      setTrouble('The umpire missed that. Check the connection and swing again.');
    } finally {
      setBusy(false);
    }
  }, [match, busy]);

  const onOut = useCallback((reason: 'clock' | 'nothing') => {
    setMatch((m) => (m && phase(m) === 'swing' ? out(m, reason) : m));
  }, []);

  const onNext = useCallback(() => setMatch((m) => (m ? next(m) : m)), []);
  const onRematch = useCallback(() => setMatch((m) => (m ? rematch(m) : m)), []);
  const onQuit = useCallback(() => { setMatch(null); setTrouble(null); }, []);
  const onRetry = useCallback(() => { setTrouble(null); dealing.current = false; setMatch((m) => (m ? { ...m } : m)); }, []);

  const settings: Settings = useMemo(() => match?.settings ?? setup.settings, [match, setup]);

  if (!ready) return <div className="slug-shell" aria-busy="true" />;

  if (!match) {
    return <Setup value={setup} onStart={start} />;
  }

  return (
    <Ballpark
      match={match}
      settings={settings}
      index={index}
      busy={busy}
      trouble={trouble}
      onPitch={onPitch}
      onSwing={onSwing}
      onOut={onOut}
      onNext={onNext}
      onRematch={onRematch}
      onQuit={onQuit}
      onRetry={onRetry}
    />
  );
}
