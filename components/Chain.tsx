'use client';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import ChainBoard from './ChainBoard';
import ChainSearch from './ChainSearch';
import Sticker from './Sticker';
import { useSwing } from './swing';
import { shortClubName } from './ClubBadge';
import type { ClubView } from '../src/lib/clubs';
import { initChain, chainReduce } from '../src/game/chainState';
import { chainLinks, neighboursOf } from '../src/lib/chain/score';
import LockIn from './LockIn';
import { chainResult } from '../src/lib/chain/result';
import { buildIndex } from '../src/lib/search/index';
import type { ChainPuzzle } from '../src/lib/chain/types';
import { clubColour, splitRing, SIGNATURE_CLUB } from '../src/lib/club-colours';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

const NEUTRAL_GROUND = 'var(--ground-neutral)';

/** The silhouette, as the mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 32" aria-hidden>
      <rect x="0.5" y="0.5" width="25" height="31" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="13" cy="11" r="5" fill="currentColor" />
      <path d="M4 26 C4 19 8 16 13 16 C18 16 22 19 22 26 Z" fill="currentColor" />
    </svg>
  );
}

/** The copy under the cursor: the same sticker, lifted, on a spring. */
function DragSticker({ player, image }: { player: Player; image: PortraitImage | undefined }) {
  const ref = useSwing({ active: true, scale: 1.05 });
  return (
    <div ref={ref} style={{ pointerEvents: 'none' }}>
      <Sticker player={player} image={image} ground={NEUTRAL_GROUND} lifted />
    </div>
  );
}

export default function Chain({
  players, puzzle, images, clubs,
}: {
  players: Player[];
  puzzle: ChainPuzzle;
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
}) {
  const mode = puzzle.mode ?? 'chemistry';
  const pool = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const index = useMemo(() => buildIndex(players), [players]);

  const [state, dispatch] = useReducer(chainReduce, undefined, () => initChain(puzzle, pool));
  const [focused, setFocused] = useState<number | null>(null);
  const [dragging, setDragging] = useState<Player | null>(null);
  const [overSlot, setOverSlot] = useState(false);
  // The slot filled a moment ago plays the stick-down, then clears itself.
  const [landed, setLanded] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const prescribed = useMemo(() => puzzle.prescribedLinks ?? {}, [puzzle.prescribedLinks]);
  const closed = puzzle.closed ?? false;
  const clues = useMemo(() => puzzle.clues ?? {}, [puzzle.clues]);
  const completion = puzzle.scoring === 'completion';
  const links = useMemo(
    () => chainLinks(state.filled, pool, mode, prescribed, closed),
    [state.filled, pool, mode, prescribed, closed],
  );

  const result = useMemo(
    () => (state.submitted ? chainResult(state.filled, puzzle, players, pool) : null),
    [state.submitted, state.filled, puzzle, players, pool],
  );

  const blanks = puzzle.slots.filter((s) => s == null).length;

  useEffect(() => {
    if (landed === null) return;
    const t = setTimeout(() => setLanded(null), 600);
    return () => clearTimeout(t);
  }, [landed]);

  function onDragStart(e: DragStartEvent) {
    const id = e.active.data.current?.playerId as string | undefined;
    setDragging(id ? pool.get(id) ?? null : null);
  }

  function onDragOver(e: DragOverEvent) {
    setOverSlot(String(e.over?.id ?? '').startsWith('slot:'));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    setOverSlot(false);
    const playerId = e.active.data.current?.playerId as string | undefined;
    const from = e.active.data.current?.fromSlot as string | undefined;
    const target = e.over?.id as string | undefined;
    if (!playerId) return;
    if (target?.startsWith('slot:')) {
      const i = Number(target.slice(5));
      dispatch({ type: 'place', index: i, playerId });
      setLanded(i);
      return;
    }
    // Dragged off the board: the sticker comes off the page.
    if (from?.startsWith('slot:')) dispatch({ type: 'unplace', index: Number(from.slice(5)) });
  }

  // While the takeover is up, the board behind it stays as the player left
  // it; otherwise the links would turn green under the overlay first.
  const boardRevealed = state.submitted && !showResult;

  /**
   * The ground behind each sticker: the clubs that put the player there.
   * A given wears its signature club from the start. A pick wears neutral
   * until the seal, because the ground would otherwise answer the question.
   */
  const groundFor = (i: number): string => {
    const id = state.filled[i];
    if (!id) return NEUTRAL_GROUND;
    if (puzzle.slots[i] != null) {
      return clubColour(SIGNATURE_CLUB[id] ?? pool.get(id)?.clubIds[0]);
    }
    if (!boardRevealed) return NEUTRAL_GROUND;
    const held = neighboursOf(i, state.filled.length, closed).map(({ link }) => links[link]).filter((l) => l?.made);
    if (held.length === 0) return 'var(--red)';
    const [a, b] = held.map((l) => clubColour(l!.required ?? l!.clubs[0]));
    return b === undefined ? a! : splitRing(a!, b, 'var(--sticker)');
  };

  const complete = state.filled.every((id) => id !== null);
  const placed = state.filled.filter((id, i) => id !== null && puzzle.slots[i] == null).length;

  const name = (id: string | null | undefined) => {
    const p = id ? pool.get(id) : undefined;
    return p ? plateName(p.id, p.name) : '?';
  };
  const ends: [string, string] = [name(puzzle.slots[0]), name(puzzle.slots[puzzle.slots.length - 1])];
  const corners = closed ? puzzle.slots.flatMap((id) => (id ? [name(id)] : [])) : undefined;
  const namedClub = useMemo(() => {
    const first = Object.values(prescribed)[0];
    return first ? shortClubName(clubs[first]?.name ?? first) : undefined;
  }, [prescribed, clubs]);
  const count = ['no', 'one', 'two', 'three', 'four', 'five'][blanks] ?? String(blanks);
  const grade = puzzle.difficulty ? puzzle.difficulty[0]!.toUpperCase() + puzzle.difficulty.slice(1) : null;

  return (
    <DndContext id="chain" onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="app">
        <header className="masthead">
          <a className="masthead__brand display" href="/">
            <Mark className="masthead__mark" />
            Chain
          </a>
          <div className="masthead__meta">
            <span>Board {puzzle.id}</span>
            {grade ? <span className="pill">{grade}</span> : null}
          </div>
        </header>

        <main className="stage">
          <div className="board-col">
            <p className="brief">
              {corners ? (
                <>Close the ring: <b>{corners.slice(0, -1).join(', ')}</b> and <b>{corners[corners.length - 1]}</b>, with a link between each pair.</>
              ) : namedClub ? (
                <>Find the {count} who take <b>{ends[0]}</b> to <b>{ends[1]}</b>, through <b>{namedClub}</b>.</>
              ) : (
                <>Find the {count} who take <b>{ends[0]}</b> to <b>{ends[1]}</b>.</>
              )}
              <span className="brief__note">
                {completion
                  ? 'Every link is a shared club, and each plate says who fits it. The chain holds or it doesn’t.'
                  : mode === 'clubs'
                    ? 'Every link is a shared club. The less obvious the name, the better.'
                    : 'Every link green. The less obvious the name, the better.'}
              </span>
            </p>

            <ChainBoard
              fill={state.filled}
              slots={puzzle.slots}
              links={links}
              mode={mode}
              clubs={clubs}
              images={images}
              players={pool}
              revealed={boardRevealed}
              groundFor={groundFor}
              focused={focused}
              onFocus={setFocused}
              landedIndex={landed}
              closed={closed}
              clues={clues}
              clueMetFor={(i) => (boardRevealed ? result?.slots.find((s) => s.index === i)?.clueMet ?? null : null)}
              interactive={!state.submitted}
            />

            <div className="actions">
              <button
                type="button"
                className="seal"
                disabled={!complete || state.submitted}
                onClick={() => { setShowResult(true); dispatch({ type: 'submit' }); }}
              >
                {state.submitted ? 'Sealed' : 'Seal it'}
              </button>
              <span className="actions__count">
                {state.submitted
                  ? 'One submission, and this was it.'
                  : `${placed} of ${blanks} filled`}
              </span>
            </div>
          </div>

          {/* The old search rail, until the search sheet replaces it. */}
          <aside className="rail">
            <ChainSearch
              state={state}
              index={index}
              images={images}
              focused={focused}
              onAddToBench={() => {}}
              onPlace={(i, id) => { dispatch({ type: 'place', index: i, playerId: id }); setLanded(i); }}
            />
          </aside>
        </main>
      </div>

      {result && showResult ? (
        <LockIn
          result={result}
          puzzle={puzzle}
          fill={state.filled}
          links={links}
          pool={pool}
          images={images}
          clubs={clubs}
          onDismiss={() => setShowResult(false)}
        />
      ) : null}

      <DragOverlay dropAnimation={overSlot ? null : { duration: 240, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' }}>
        {dragging ? <DragSticker player={dragging} image={images[dragging.id]} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
