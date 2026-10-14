'use client';
import { useEffect, useState } from 'react';
import { Mark } from './Chain';
import BoardPreview from './BoardPreview';
import MastNav from './MastNav';
import { GradeChip } from './Slab';
import { Figure } from './Sticker';
import type { BoardSummary, Given } from '../src/lib/chain/client';
import { boardForDay, dateOfDay, dayNumber, localDate, longDate } from '../src/lib/daily';
import { readProgress, streakOf, type Play, type Progress } from '../src/lib/progress';
import { MARK_GLYPH, shareLine } from '../src/lib/chain/share';
import { plateName } from '../src/lib/short-name';
import Back from './Back';

/**
 * The home page: an album page with today's stickers on it.
 *
 * The board itself is the front door, drawn as it will be played, with
 * the givens on their grounds and the plates still grey. Then the streak,
 * how it works, the ladder for anyone who wants a harder board, and the
 * dailies gone by. Everything the page knows about the player is in
 * localStorage, read once on mount.
 */
export default function Home({ boards }: { boards: BoardSummary[] }) {
  const dailyIds = boards.filter((b) => b.daily).map((b) => b.id);
  const byId = new Map(boards.map((b) => [b.id, b]));
  const [today, setToday] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ plays: {} });

  useEffect(() => {
    setToday(dayNumber(localDate()));
    setProgress(readProgress());
  }, []);

  const todayId = today !== null ? boardForDay(today, dailyIds) : null;
  const todayBoard = todayId ? byId.get(todayId) : undefined;
  const todayPlay = todayId ? progress.plays[todayId] : undefined;
  const streak = today !== null ? streakOf(progress, today) : { current: 0, best: 0 };

  const ladder = boards.filter((b) => !b.daily && !b.deep);
  const archive = today !== null
    ? Array.from({ length: Math.min(today - 1, 30) }, (_, i) => today - 1 - i)
        .map((day) => ({ day, id: boardForDay(day, dailyIds)! }))
        .filter(({ id }) => byId.has(id))
    : [];

  return (
    <div className="app">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/chain">
          <Mark className="masthead__mark" />
          Chain
        </a>
        <div className="masthead__meta">
          {streak.current > 0 ? <span className="pill">Streak {streak.current}</span> : null}
          <MastNav />
        </div>
      </header>

      <main className="home">
        <section className="page page--hero">
          <span className="page__tab display">Today</span>
          {today === null || !todayBoard ? (
            <div className="hero hero--loading" aria-busy="true">
              <p className="hero__eyebrow">Chain</p>
              <h1 className="hero__head display">Today’s chain</h1>
            </div>
          ) : (
            <Hero board={todayBoard} day={today} play={todayPlay} streak={streak} />
          )}
        </section>

        <section className="how">
          <h2 className="home__head display">How it works</h2>
          <ol className="how__steps">
            <li className="how__step">
              <div className="how__art" aria-hidden>
                <MiniSticker ground="#A50044" name="Messi" />
                <span className="plink plink--h"><span className="plink__rule" /><span className="plink__die" /></span>
                <MiniSticker ground="var(--silhouette)" empty />
              </div>
              <p><b>Every link is a club two players both played for.</b> The givens are on the page. The gaps are yours.</p>
            </li>
            <li className="how__step">
              <div className="how__art" aria-hidden>
                <MiniSticker ground="var(--silhouette)" empty hint="a German" />
              </div>
              <p><b>Each empty sticker says who fits it.</b> A plate that asks for a German only holds with a German. Tap it, name the player. Stuck? Show a given’s clubs, at the cost of a yellow square.</p>
            </li>
            <li className="how__step">
              <div className="how__art" aria-hidden>
                <span className="seal seal--art">Seal it</span>
                <span className="how__grid">🟩🟩🟩</span>
              </div>
              <p><b>Seal it once.</b> The chain holds or it doesn’t, and your streak counts the days it held.</p>
            </li>
          </ol>
        </section>

        {ladder.length > 0 ? (
          <section className="ladder">
            <h2 className="home__head display">The ladder</h2>
            <p className="track__blurb">No single right answer: anyone who fits will do. The easy one has seventy ways in, the hard one a handful, and the ring asks four questions at once.</p>
            <ul className="ladder__list">
              {ladder.map((b) => {
                const play = progress.plays[b.id];
                const label = b.closed ? 'The ring' : b.difficulty ? b.difficulty[0]!.toUpperCase() + b.difficulty.slice(1) : 'Open';
                return (
                  <li key={b.id}>
                    <a className={`page page--card ${play ? (play.held ? 'page--held' : 'page--broke') : ''}`} href={`/play/${b.id}`}>
                      <span className={`page__tab page__tab--${b.closed ? 'ring' : b.difficulty ?? 'ring'} display`}>{label}</span>
                      <BoardPreview board={b} links={play?.links ?? null} plates={false} />
                      <span className="page__foot">
                        <span className="page__name">{givensLine(b.slots)}</span>
                        <span className="page__meta">{play ? <Grid play={play} /> : `${b.slots.filter((s) => !s).length} to find`}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="deep-promo">
          <h2 className="home__head display">Deep Cuts</h2>
          <a className="page deep-promo__card" href="/deep">
            <span className="deep-promo__chips" aria-hidden>
              <GradeChip grade="rare" />
              <GradeChip grade="niche" />
              <GradeChip grade="gem" />
              <GradeChip grade="grail" />
            </span>
            <span className="deep-promo__copy">
              <b>Thirty open boards where going deep is the point.</b> Anyone who links holds; the players nobody else
              remembers come back as rarer cards, from bronze up to the Grail. Keep them in your collection.
            </span>
            <span className="also__go deep-promo__go">Start digging →</span>
          </a>
        </section>

        {archive.length > 0 ? (
          <section className="archive">
            <h2 className="home__head display">Past chains</h2>
            <ul className="board-list">
              {archive.map(({ day, id }) => {
                const b = byId.get(id)!;
                const play = progress.plays[id];
                return (
                  <li key={day}>
                    <a className="board-row" href={`/play/${id}`}>
                      <span className="board-row__id display">#{day}</span>
                      <span className="board-row__strip" aria-hidden>
                        {b.slots.flatMap((s) => (s ? [<i key={s.id} style={{ background: s.ground }} />] : []))}
                      </span>
                      <span className="board-row__name">{givensLine(b.slots)}</span>
                      <span className="board-row__meta">{play ? <Grid play={play} /> : <span className="board-row__todo">Not played</span>}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}

/** Today's board, or the result if it has been played. */
function Hero({ board, day, play, streak }: {
  board: BoardSummary;
  day: number;
  play: Play | undefined;
  streak: { current: number; best: number };
}) {
  const blanks = board.slots.filter((s) => !s).length;
  const count = ['no', 'one', 'two', 'three', 'four', 'five'][blanks] ?? String(blanks);
  return (
    <div className={`hero ${play ? (play.held ? 'hero--held' : 'hero--broke') : ''}`}>
      <div className="hero__copy">
        <p className="hero__eyebrow">Chain #{day} · {longDate(dateOfDay(day))}</p>
        {play ? (
          <>
            <h1 className="hero__head display">{play.held ? 'Chain held' : 'Chain broke'}</h1>
            <p className="brief">
              {streak.current > 0 ? `Day ${streak.current} of your streak.` : 'Tomorrow is a new chain.'}
              {streak.best > streak.current ? ` Your best is ${streak.best}.` : ''}
            </p>
            <div className="hero__actions">
              <ShareButton text={shareLine({ title: `Chain #${day}`, plates: play.plates ?? [] })} />
              <a className="actions__link" href={`/play/${board.id}`}>Look at the board</a>
            </div>
          </>
        ) : (
          <>
            <h1 className="hero__head display">{board.closed ? 'Close the ring' : 'Link the ends'}</h1>
            <p className="brief">
              <b>{givensLine(board.slots)}</b>. {count[0]!.toUpperCase() + count.slice(1)} to find, a clue on each.
            </p>
            <div className="hero__actions">
              <a className="seal seal--link" href={`/play/${board.id}`}>Play today’s chain</a>
            </div>
            {streak.current > 0 ? <p className="brief__note">Day {streak.current} of your streak. Keep it going.</p> : null}
          </>
        )}
      </div>
      <a className="hero__board" href={`/play/${board.id}`} aria-label={play ? 'Look at the board' : 'Play today’s chain'}>
        <BoardPreview board={board} links={play?.links ?? null} />
      </a>
    </div>
  );
}

/** The result as glyphs, the same ones the share line uses. */
function Grid({ play }: { play: Play }) {
  return <span className="grid">{(play.plates ?? []).map((m) => MARK_GLYPH[m]).join('')}</span>;
}

function givensLine(slots: readonly (Given | null)[]): string {
  const g = slots.flatMap((s) => (s ? [plateName(s.id, s.name)] : []));
  return g.length <= 1 ? g.join('') : `${g.slice(0, -1).join(', ')} and ${g[g.length - 1]}`;
}

/** A sticker for the how-to strip: no player, just the shape. */
function MiniSticker({ ground, name, empty = false, hint = '' }: { ground: string; name?: string; empty?: boolean; hint?: string }) {
  return (
    <span className={`sticker sticker--still ${empty ? 'sticker--empty' : ''}`}>
      <span className="sticker__photo" style={empty ? undefined : { background: ground }}>
        <Figure tone={empty ? 'var(--silhouette-figure)' : 'rgba(255,255,255,0.45)'} />
      </span>
      <span className="sticker__plate">
        {empty ? <span className="sticker__hint">{hint}</span> : <span className="sticker__name">{name?.toUpperCase()}</span>}
      </span>
    </span>
  );
}

function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(text); setState('copied'); } catch { setState('failed'); }
    setTimeout(() => setState('idle'), 2200);
  }
  return <button type="button" className="seal" onClick={copy}>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Share'}</button>;
}
