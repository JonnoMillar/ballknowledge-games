'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import Back from '../../../components/Back';
import { GAMES } from '../../../src/games';
import Bib from './Bib';
import ClubBadge from '../../../components/ClubBadge';
import { StickerFace, solid } from '../../../components/Sticker';
import Setup from './Setup';
import { newMatch, type Clock, type Match } from '../lib/match';
import { readMatch, readSaved, writeMatch, writeSaved, type Saved } from '../lib/store';
import { smooth } from '../../../src/lib/motion';
import Words from '../../../components/Words';
import type { DemoBall } from '../server';

/** Rondo's ground: the same orange as its tile on the hub. */
const GROUND = GAMES.find((g) => g.id === 'rondo')!.ground;

/**
 * The way in, laid out like every game's front page: the hero on Rondo's
 * lit ground with the hub's miniature, paper cards beneath.
 *
 * - The hero: the ask on the left; who's playing, the clock, and Kick off
 *   (the page's one red button) on the right. Rondo is not a daily, so no
 *   day tag.
 *   A match in progress on this phone gets a quiet way back under it.
 * - How it goes: a looping demo of one real ball beside the three rules in
 *   plain words, each rule lit while the demo shows it.
 */
export default function Lobby({ demo }: { demo: DemoBall }) {
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
            {me?.match ? <a className="rondo-lobby__resume vt" href="/rondo/play">Match in progress · back to it</a> : null}
          </div>
        </section>

        <How demo={demo} />
      </main>
    </div>
  );
}

/**
 * How it goes. The demo plays one ball on a 10 s loop (CSS only, in
 * rondo.css): Rooney; Ronaldo, through United; Benzema, through Madrid;
 * both crests are crossed out; Benzema is stuck and a bib lands. Each rule
 * lights up while the demo shows it. Reduced motion shows the last frame.
 */
function How({ demo }: { demo: DemoBall }) {
  const [a, b, c] = demo.players;
  const [united, madrid] = demo.clubs;
  const player = (p: typeof a, n: number) => (
    <span className={`rondo-demo__p rondo-demo__p--${n}`}>
      <StickerFace player={p!} image={p!.image} ground={solid(p!.ground)} className="sticker--still" />
    </span>
  );
  const link = (k: typeof united, n: number) => (
    <span className={`rondo-demo__link rondo-demo__link--${n}`}>
      <ClubBadge clubId={k!.id} club={k!.club} size={26} />
    </span>
  );
  return (
    <section className="lobby-card lobby__wide rondo-how vt">
      <span className="lobby-tag lobby-tag--paper">How it goes</span>
      <div className="rondo-how__body">
        <div className="rondo-demo" aria-hidden>
          <div className="rondo-demo__row">
            {player(a, 1)}{link(united, 1)}{player(b, 2)}{link(madrid, 2)}{player(c, 3)}
          </div>
          <div className="rondo-demo__bibs">
            <span className="rondo-demo__bib"><Bib earned={false} size={22} /><Bib earned size={22} className="rondo-demo__earned" /></span>
            <Bib earned={false} size={22} />
            <Bib earned={false} size={22} />
          </div>
        </div>
        <ol className="rondo-how__rules">
          <li>Name a player who played for one of the same clubs as the player on the ball.</li>
          <li>A club that links two players can’t be used again.</li>
          <li>Can’t name anyone? That’s a strike. Three strikes and you’re out.</li>
        </ol>
      </div>
      <p className="how__note">The ref knows 11,741 players since 1992.</p>
    </section>
  );
}
