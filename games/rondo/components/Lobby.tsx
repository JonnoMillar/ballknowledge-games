'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import Back from '../../../components/Back';
import { GAMES } from '../../../src/games';
import Bib from './Bib';
import Setup from './Setup';
import { BIBS_OUT, newMatch, type Clock, type Match } from '../lib/match';
import { readMatch, readSaved, writeMatch, writeSaved, type Saved } from '../lib/store';
import { smooth } from '../../../src/lib/motion';
import Words from '../../../components/Words';

/** Rondo's ground: the same orange as its tile on the hub. */
const GROUND = GAMES.find((g) => g.id === 'rondo')!.ground;

/**
 * The way in, laid out like every game's front page: the hero on Rondo's
 * lit ground with the hub's miniature, paper cards beneath.
 *
 * - The hero: the ask on the left; who's playing, the clock, and Kick off
 *   (the page's one red button) on the right. Rondo is not a daily, so no
 *   day tag.
 * - A match in progress, if the phone has one: the names and bibs, and the
 *   way back to it.
 * - How it goes: the four rules.
 */
export default function Lobby() {
  // Read after mount: localStorage is the phone's, and the server render knows nothing of it.
  const [me, setMe] = useState<{ match: Match | null; saved: Saved } | null>(null);
  // The form is there from the first frame (blank), so the hero it sits in
  // can grow out of the hub's tile; the phone's memory then fills in smoothly.
  useEffect(() => {
    const m = readMatch();
    const next = { match: m && !m.over ? m : null, saved: readSaved() };
    if (next.match || next.saved.names.length || next.saved.clock !== 30) void smooth(() => setMe(next));
    else setMe(next);
  }, []);

  const start = (names: string[], clock: Clock) => {
    if (me?.match && !confirm('Start a new match? The one in progress ends.')) return;
    writeSaved({ names, clock });
    writeMatch(newMatch(names, clock));
    location.assign('/rondo/play');
  };

  return (
    <div className="app rondo">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/rondo">Rondo</a>
      </header>
      <main className="lobby">
        <section className="lobby-hero lobby__wide" style={{ '--ground': GROUND } as CSSProperties}>
          <span className="lobby-hero__ground" style={{ viewTransitionName: 'game-rondo' }} aria-hidden />
          <img className="lobby-hero__mini" src="/hub/rondo.webp" alt="" width={480} height={480} style={{ viewTransitionName: 'game-rondo-mini' }} />
          <div className="lobby-hero__ask vt">
            <span className="lobby-tag">Multiplayer</span>
            <h1 className="lobby-hero__head display"><Words text="Fancy a rondo?" /></h1>
            <p className="lobby-hero__sub">Two to four of you and one phone. Pass it round; don’t lose the ball.</p>
          </div>
          <div className="lobby-hero__go">
            <Setup key={me ? 'saved' : 'blank'} initialNames={me?.saved.names ?? []} initialClock={me?.saved.clock ?? 30} onStart={start} />
          </div>
        </section>

        {me?.match ? <Resume match={me.match} /> : null}

        <section className={`lobby-card rondo-how vt ${me?.match ? '' : 'lobby__wide'}`}>
          <span className="lobby-tag lobby-tag--paper">How it goes</span>
          <ol className="how__rules">
            <li><b>Someone’s on the ball.</b> Pass to a player who shared a club with them. Say it, then type it — the phone’s the ref.</li>
            <li><b>Every club a pass goes through is burnt</b> for the rest of the ball. No club twice, no player twice.</li>
            <li><b>Can’t find one? You’ve lost it.</b> Take a bib. A pass nobody could take on is a dead end — your bib too.</li>
            <li><b>Three bibs and you’re in the middle.</b> Last one standing keeps the ball.</li>
          </ol>
          <p className="how__note">
            The ref knows 11,741 players and every club they played for, from 1992 on. If the ref doesn’t know them, they don’t count.
          </p>
        </section>
      </main>
    </div>
  );
}

/** The match on this phone: who's in it, their bibs, and the way back. Never red. */
function Resume({ match }: { match: Match }) {
  return (
    <a className="lobby-card lobby-link rondo-resume vt" href="/rondo/play">
      <span className="lobby-tag lobby-tag--paper">Match in progress</span>
      <ol className="rondo-resume__sides">
        {match.players.map((p, i) => (
          <li key={i} className={p.bibs >= BIBS_OUT ? 'is-out' : ''}>
            <span className="rondo-resume__name display">{p.name}</span>
            <span className="rondo-resume__bibs" aria-label={`${p.bibs} of ${BIBS_OUT} bibs`}>
              {Array.from({ length: BIBS_OUT }, (_, k) => <Bib key={k} earned={k < p.bibs} size={15} />)}
            </span>
          </li>
        ))}
      </ol>
      <span className="lobby-link__line">
        {match.ballNo ? `Ball ${match.ballNo}` : 'Kick-off'} · back to it
        <svg className="lobby-link__arrow" viewBox="0 0 20 12" aria-hidden><path d="M1 6h17M13 1.5 18 6l-5 4.5" /></svg>
      </span>
    </a>
  );
}
