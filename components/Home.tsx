'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Mark } from './Chain';
import BoardPreview from './BoardPreview';
import MastNav from './MastNav';
import ClubBadge, { shortClubName } from './ClubBadge';
import { Figure, StickerFace, solid } from './Sticker';
import Back from './Back';
import LobbyLink from './LobbyLink';
import { GAMES } from '../src/games';
import { pastPuzzles } from './PuzzleArchive';
import type { BoardSummary } from '../src/lib/chain/client';
import type { ClubView } from '../src/lib/clubs';
import type { PortraitImage } from '../src/lib/portraits';
import { boardForDay, dayNumber, localDate } from '../src/lib/daily';
import { readProgress, streakOf, type Play, type Progress } from '../src/lib/progress';
import { shareLine } from '../src/lib/chain/share';
import { doneToday } from '../src/lib/today';
import { readCollection } from '../src/lib/collection';
import Words from './Words';
import { PuzzleHow, StepsHow } from './ChainHow';
import type { ChainDemo, StepsDemo } from '../src/lib/demo';

/** Steps stands on Chain's ground, the same as its tile on the hub. */
const GROUND = GAMES.find((g) => g.id === 'chain')!.ground;

/** The first step of today's Steps run, as `/api/step/day` sends it. Only what the preview draws. */
type FirstStep = {
  day: number;
  player: { id: string; name: string; image: PortraitImage | null; ground: string };
  club: { id: string; club: ClubView };
  playerFirst: boolean;
};

/**
 * Chain's hub: two dailies and their archives.
 *
 * Laid out like every game's front page (Spoofed's is the pattern): the
 * lead daily on its own lit ground with the hub's miniature, paper cards
 * beneath, big archive cards side by side.
 *
 * - Steps, on top: one gap at a time, any answer that fits, the deeper the
 *   rarer the card. Dark ground, the cards' world.
 * - The puzzle: one board, one answer per plate, seal it once. Paper.
 * - The two archives, then the collection the Steps cards go into.
 * - How to play each, side by side on the shared card.
 *
 * The one red button goes to whichever daily is next: Steps, then the
 * puzzle. Once both are done there is none.
 */
export default function Home({ boards, demos }: { boards: BoardSummary[]; demos: { chain: ChainDemo; steps: StepsDemo } }) {
  const daily = boards.filter((b) => b.daily);
  const byId = new Map(boards.map((b) => [b.id, b]));
  const [today, setToday] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ plays: {} });
  const [done, setDone] = useState<Set<string>>(new Set());
  const [first, setFirst] = useState<FirstStep | null>(null);
  const [cards, setCards] = useState<number | null>(null);

  useEffect(() => {
    setToday(dayNumber(localDate()));
    setProgress(readProgress());
    setDone(doneToday());
    setCards(Object.keys(readCollection()).length);
    fetch(`/api/step/day?date=${localDate()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { day: number; steps: Omit<FirstStep, 'day'>[] } | null) => {
        if (d?.steps[0]) setFirst({ day: d.day, ...d.steps[0] });
      }, () => {});
  }, []);

  const todayId = today !== null ? boardForDay(today, daily) : null;
  const board = todayId ? byId.get(todayId) : undefined;
  const play = todayId ? progress.plays[todayId] : undefined;
  const streak = today !== null ? streakOf(progress, today) : { current: 0, best: 0 };
  const stepsDone = done.has('step');
  const toPlay = today === null ? null : pastPuzzles(today, daily).filter(({ id }) => byId.has(id) && !progress.plays[id]).length;

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

      <main className="lobby chub">
        <section className="lobby-hero lobby__wide" style={{ '--ground': GROUND } as CSSProperties}>
          <span className="lobby-hero__ground" style={{ viewTransitionName: 'game-chain' }} aria-hidden />
          <img className="lobby-hero__mini" src="/hub/steps.webp" alt="" width={480} height={480} style={{ viewTransitionName: 'game-chain-mini' }} />
          <div className="lobby-hero__ask">
            <span className="lobby-tag">Steps{today ? ` #${today}` : ''}</span>
            <h1 className="lobby-hero__head display"><Words text="How niche can you go?" /></h1>
            <p className="lobby-hero__sub">Any answer holds. The rarer it is, the better the card.</p>
          </div>
          <div className="lobby-hero__go">
            <StepPreview first={first} />
            {today === null ? null : stepsDone ? (
              <div className="chub__after">
                <span className="chub__donemark">✓ Done today</span>
                <a className="lobby-quiet" href="/step">See your cards</a>
              </div>
            ) : (
              <a className="lobby-play" href="/step">Play today’s steps</a>
            )}
          </div>
        </section>

        <section className="lobby-card lobby__wide chub__puzzle">
          <span className="lobby-tag lobby-tag--paper">Puzzle{today ? ` #${today}` : ''}</span>
          {today === null || !board ? (
            <div className="hero hero--loading" aria-busy="true" />
          ) : (
            <Puzzle board={board} day={today} play={play} streak={streak} next={stepsDone} />
          )}
        </section>

        <LobbyLink href="/step/archive" title="Steps archive" line="Every run so far" />
        <LobbyLink
          href="/chain/archive"
          title="Puzzle archive"
          line={toPlay === null ? ' ' : toPlay ? `${toPlay} still to play` : 'Every one played'}
        />
        <div className="lobby__wide">
          <LobbyLink
            href="/collection"
            title="Collection"
            icon="cards"
            line={cards === null ? ' ' : cards ? `${cards} ${cards === 1 ? 'card' : 'cards'}, rarest first` : 'Every card you win in Steps'}
          />
        </div>

        <StepsHow demo={demos.steps} />
        <PuzzleHow demo={demos.chain} />
      </main>
    </div>
  );
}

/** The first step as it will be played: the given, the gap, the club. */
function StepPreview({ first }: { first: FirstStep | null }) {
  const gap = (
    <span className="sticker sticker--empty sticker--still" key="gap">
      <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
      <span className="sticker__plate"><span className="sticker__no">?</span></span>
    </span>
  );
  if (!first) return <div className="chub__preview chub__preview--wait" aria-hidden />;
  const player = (
    <StickerFace key="p" player={first.player} image={first.player.image ?? undefined} ground={solid(first.player.ground)} className="sticker--still" />
  );
  const club = (
    <span className="chub__club" key="c">
      <ClubBadge clubId={first.club.id} club={first.club.club} size={56} />
      <span className="chub__clubname display">{shortClubName(first.club.club.name)}</span>
    </span>
  );
  const line = first.playerFirst ? [player, gap, club] : [club, gap, player];
  return <div className="chub__preview" aria-hidden>{line}</div>;
}

/** Today's puzzle, or its result. Its button is red only once Steps is done. */
function Puzzle({ board, day, play, streak, next }: {
  board: BoardSummary;
  day: number;
  play: Play | undefined;
  streak: { current: number; best: number };
  next: boolean;
}) {
  return (
    <div className={`hero ${play ? (play.held ? 'hero--held' : 'hero--broke') : ''}`}>
      <div className="hero__copy">
        {play ? (
          <>
            <h2 className="hero__head display">{play.held ? 'Chain held' : 'Chain broke'}</h2>
            <p className="brief">{streak.current > 0 ? `Day ${streak.current} of your streak.` : 'A new one tomorrow.'}</p>
            <div className="hero__actions">
              <ShareButton text={shareLine({ title: `Chain #${day}`, plates: play.plates ?? [] })} loud={next} />
              <a className="lobby-quiet" href={`/play/${board.id}`}>Look at the board</a>
            </div>
          </>
        ) : (
          <>
            <h2 className="hero__head display">Puzzle mode</h2>
            <div className="hero__actions">
              <a className={next ? 'lobby-play' : 'lobby-quiet'} href={`/play/${board.id}`}>Play today’s puzzle</a>
            </div>
          </>
        )}
      </div>
      <a className="hero__board" href={`/play/${board.id}`} aria-label={play ? 'Look at the board' : 'Play today’s puzzle'}>
        <BoardPreview board={board} links={play?.links ?? null} />
      </a>
    </div>
  );
}

function ShareButton({ text, loud }: { text: string; loud: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(text); setState('copied'); } catch { setState('failed'); }
    setTimeout(() => setState('idle'), 2200);
  }
  return <button type="button" className={loud ? 'lobby-play' : 'lobby-quiet'} onClick={copy}>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Share'}</button>;
}

