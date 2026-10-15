'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import Back from '../../../components/Back';
import Words from '../../../components/Words';
import { GAMES } from '../../../src/games';
import { smooth } from '../../../src/lib/motion';
import Setup from './Setup';
import { newMatch, type Match, type Options } from '../lib/match';
import { readMatch, readSaved, writeMatch, writeSaved, type Saved } from '../lib/store';

const GROUND = GAMES.find((g) => g.id === 'bluff')!.ground;

/**
 * The way in, on the site's front-page kit: the hero on the game's ground
 * with the ask on the left and the setup (and Kick off, the page's one red
 * button) on the right; How it goes beneath.
 */
export default function Lobby({ years, count }: { years: { first: number; last: number }; count: number }) {
  const blank: Options = { from: years.first, to: years.last, help: true };
  // localStorage is the phone's; the server render knows nothing of it.
  const [me, setMe] = useState<{ match: Match | null; saved: Saved } | null>(null);
  useEffect(() => {
    const m = readMatch();
    const next = { match: m && m.winner === null ? m : null, saved: readSaved() };
    if (next.match || next.saved.names.length || next.saved.options) void smooth(() => setMe(next));
    else setMe(next);
  }, []);

  const start = (names: string[], options: Options) => {
    if (me?.match && !confirm('Start a new match? The one in progress ends.')) return;
    writeSaved({ names, options });
    writeMatch(newMatch(names, options, me?.match?.seen ?? []));
    location.assign('/bluff/play');
  };

  // Saved years outside what there is now (a rebuilt data file) fall back to the full range.
  const saved = me?.saved.options;
  const initial = saved && saved.from >= years.first && saved.to <= years.last ? saved : blank;

  return (
    <div className="app bluff">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/bluff">Bluff</a>
      </header>
      <main className="lobby">
        <section className="lobby-hero lobby__wide" style={{ '--ground': GROUND } as CSSProperties}>
          <span className="lobby-hero__ground" style={{ viewTransitionName: 'game-bluff' }} aria-hidden />
          <div className="lobby-hero__ask vt">
            <span className="lobby-tag">Multiplayer</span>
            <h1 className="lobby-hero__head display"><Words text="Who’s the ringer?" /></h1>
            <p className="lobby-hero__sub">A real team sheet with one player swapped. Two or more of you, one phone.</p>
          </div>
          <div className="lobby-hero__go">
            <Setup key={me ? 'saved' : 'blank'} initialNames={me?.saved.names ?? []} initialOptions={initial} years={years} onStart={start} />
            {me?.match ? <a className="bf-lobby__resume vt" href="/bluff/play">Match in progress · back to it</a> : null}
          </div>
        </section>

        <section className="lobby-card lobby__wide bf-how vt">
          <span className="lobby-tag lobby-tag--paper">How it goes</span>
          <ol className="bf-how__rules">
            <li>One of you gets a real starting XI and swaps any one player for anyone.</li>
            <li>Pass the phone. The other taps the one they think is fake.</li>
            <li>A wrong tap costs a life, and you go again. Lose all your lives and you’re out.</li>
          </ol>
          <p className="bf-how__note">{count} team sheets from finals and knockout games, {years.first} to {years.last}, from Wikipedia.</p>
        </section>
      </main>
    </div>
  );
}
