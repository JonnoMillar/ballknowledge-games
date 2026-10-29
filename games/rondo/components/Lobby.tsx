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
import HowItWorks, { type HowRule } from '../../../components/HowItWorks';
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
 * - How to play: the shared card (components/HowItWorks.tsx), one real
 *   ball beside three plain rules.
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
            {me?.match ? <a className="lobby-quiet lobby-small lobby-resume vt" href="/rondo/play">Back to your match</a> : null}
          </div>
        </section>

        <How demo={demo} />
        <Careful stuck={demo.stuck} />
      </main>
    </div>
  );
}

/**
 * How to play, on the shared card: one real ball, in three frames. Rooney;
 * Ronaldo through United. Benzema through Madrid, and both crests are
 * crossed out. Benzema is stuck and a bib lands. Data from `demoBall()`.
 */
const RULES: HowRule[] = [
  { text: 'Name a player who shared a club with the one on the ball.', frames: [3200] },
  { text: 'A club that links two players can’t be used again.', frames: [3600] },
  { text: 'Can’t name anyone? That’s a strike. Three and you’re out.', frames: [3400] },
];

/**
 * The one thing the rules don't make obvious: a player with a single club is
 * a dead end the moment that club burns. Shown as the pass that does it, the
 * last frame of a ball: Rice, Arsenal crossed out, Saka greyed, a bib.
 */
function Careful({ stuck }: { stuck: DemoBall['stuck'] }) {
  const [rice, saka] = stuck.players;
  const face = (p: typeof rice) => (
    <StickerFace player={p!} image={p!.image} ground={solid(p!.ground)} className="sticker--still" />
  );
  return (
    <section className="lobby-card lobby__wide careful vt">
      <h2 className="lobby-tag lobby-tag--paper">Watch out</h2>
      <div className="careful__body">
        <div className="careful__stage" aria-hidden>
          <div className="rondo-demo">
            <div className="rondo-demo__row">
              <span className="rondo-demo__p">{face(rice)}</span>
              <span className="rondo-demo__link">
                <ClubBadge clubId={stuck.club.id} club={stuck.club.club} size={26} />
              </span>
              <span className="rondo-demo__p careful__stuck">{face(saka)}</span>
            </div>
            <Bib earned size={22} />
          </div>
        </div>
        <div className="careful__text">
          <h3 className="careful__head display">Don’t name a one-club player.</h3>
          <p>
            <b>{rice!.name}</b> to <b>{saka!.name}</b> goes through Arsenal. But Saka has only ever played for Arsenal,
            and Arsenal is now burnt, so he has nobody to pass to. That’s a dead end, and the strike is yours.
          </p>
          <p className="careful__ask">Before you name someone, ask where else they’ve played.</p>
        </div>
      </div>
    </section>
  );
}

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
    <HowItWorks
      rules={RULES}
      note="The ref knows 11,741 players since 1992."
      demo={(step) => (
        <div className="rondo-demo" data-step={step}>
          <div className="rondo-demo__row">
            {player(a, 1)}{link(united, 1)}{player(b, 2)}{link(madrid, 2)}{player(c, 3)}
          </div>
          <div className="rondo-demo__bibs">
            <span className="rondo-demo__bib"><Bib earned={false} size={22} /><Bib earned size={22} className="rondo-demo__earned" /></span>
            <Bib earned={false} size={22} />
            <Bib earned={false} size={22} />
          </div>
        </div>
      )}
    />
  );
}
