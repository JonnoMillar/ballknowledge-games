'use client';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DndContext, DragOverlay, useDroppable, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import PlayerCard from './PlayerCard';
import ChainRow from './ChainRow';
import ChainSearch from './ChainSearch';
import DragPicture from './DragPicture';
import Pin from './Pin';
import SheetPins from './SheetPins';
import { shortClubName } from './ClubBadge';
import { tiltFor } from './swing';
import type { ClubView } from '../src/lib/clubs';
import { initChain, chainReduce } from '../src/game/chainState';
import { chainLinks } from '../src/lib/chain/score';
import LockIn from './LockIn';
import { chainResult } from '../src/lib/chain/result';
import { buildIndex } from '../src/lib/search/index';
import type { ChainDifficulty, ChainPuzzle } from '../src/lib/chain/types';
import { clubColour, splitRing, SIGNATURE_CLUB, NEUTRAL } from '../src/lib/club-colours';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

/** Grade colours. Deliberately not the link palette: a grade is not a verdict. */
const GRADE: Record<ChainDifficulty, string> = {
  easy: 'var(--green)',
  medium: 'var(--gold)',
  hard: 'var(--accent)',
};

/**
 * The masthead.
 *
 * It used to be a browser-chrome bar across the top of the window, above the
 * sheet, which meant the thing the player was looking at had no title on it —
 * the title belonged to the application. Printing it ON the paper is the
 * whole difference between a web page about a scouting sheet and a scouting
 * sheet, and it costs nothing but moving the markup inside the border.
 */
function Masthead({ puzzle, blanks }: { puzzle: ChainPuzzle; blanks: number }) {
  const count = ['no', 'one', 'two', 'three', 'four', 'five'][blanks] ?? String(blanks);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, borderBottom: '3px solid var(--ink)', paddingBottom: 11 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div className="narrow" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Scouting sheet &middot; {count} to find
        </div>
        <div className="slab misreg" style={{ fontSize: 46, lineHeight: 0.96 }}>
          <span className="lean">CHAIN</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
        {/* A score only compares across boards once you know the boards were
            graded, so the grade is on the sheet before you start. */}
        {puzzle.difficulty ? (
          <div className="narrow stamp" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GRADE[puzzle.difficulty] }}>
            {puzzle.difficulty}
          </div>
        ) : null}
        <div style={{ width: 1, height: 36, background: 'rgba(26,20,16,0.22)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div className="narrow" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            No.
          </div>
          <div className="slab" style={{ fontSize: 26, lineHeight: 1 }}>{puzzle.id}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * The brief, and the button.
 *
 * This band is where the artboard prints how many ways the board could have
 * gone — but that is a fact about the ANSWER, and quoting field sizes to
 * somebody who is still searching is the same leak as lighting the links up
 * green. So the live sheet keeps the shape and changes the payload: the left
 * is the assignment in plain words, the right is the state of the sheet.
 *
 * The right block turning from ink to gold when the last plate is filled is
 * the only "you may now commit" signal on the screen, and it deliberately
 * says nothing about whether committing is a good idea.
 */
function Brief({
  ends, club, mode, placed, blanks, sealed, onSeal,
}: {
  ends: [string, string];
  club: string | undefined;
  mode: 'chemistry' | 'clubs';
  placed: number;
  blanks: number;
  sealed: boolean;
  onSeal: () => void;
}) {
  const complete = placed === blanks;
  return (
    <div style={{ marginTop: 18, display: 'flex', alignItems: 'stretch', border: '2.5px solid var(--ink)' }}>
      <div style={{ flexGrow: 1, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div className="narrow" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          The brief &middot; {mode === 'clubs' ? 'every link a shared club' : 'every link green'}
        </div>
        <div className="slab" style={{ fontSize: 20, lineHeight: 1.2 }}>
          {club
            ? <>Find the {blanks === 2 ? 'two' : blanks} who take {ends[0]} to {ends[1]} — through {club}.</>
            : <>Find the {blanks === 2 ? 'two' : blanks} who take {ends[0]} to {ends[1]}.</>}
        </div>
      </div>

      <button
        onClick={onSeal}
        disabled={!complete || sealed}
        className="narrow"
        style={{
          width: 176, flexShrink: 0, border: 'none', borderLeft: '2.5px solid var(--ink)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          padding: '10px 12px', cursor: complete && !sealed ? 'pointer' : 'not-allowed',
          background: complete && !sealed
            ? 'linear-gradient(148deg, #e6cb8c, #a8791f 44%, #dcb968 70%, #85601a)'
            : 'var(--panel-2)',
          transition: 'background 420ms ease',
        }}
      >
        {complete && !sealed ? (
          <>
            <span className="slab" style={{ fontSize: 21, lineHeight: 1, color: '#fffdf7', textShadow: '0 2px 0 rgba(70,48,6,0.55)' }}>
              SEAL IT
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#46300a' }}>
              One scored submission
            </span>
          </>
        ) : (
          <>
            <span className="slab" style={{ fontSize: 30, lineHeight: 0.95, color: sealed ? 'var(--muted)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {sealed ? '—' : `${placed}/${blanks}`}
            </span>
            <span className="narrow" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {sealed ? 'Sheet sealed' : 'Plates filled'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}

/**
 * The shortlist.
 *
 * Called the bench before, which borrowed a football word for something that
 * is not a bench: nobody is coming on. It is the prints a scout has pulled
 * and not yet decided about, so it looks like that — pinned to the board
 * beside the sheet, each on its own pin, because the thing the player drags
 * has to be the thing that ends up on the sheet.
 *
 * The label is on an index card pinned up with them rather than typed onto
 * the board, and there are no empty slips: on a wall, a dashed rectangle is
 * a control, and the card saying what goes here is instruction enough.
 */
function Shortlist({
  state, images, onRemove,
}: {
  state: ReturnType<typeof initChain>;
  images: Record<string, PortraitImage>;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });
  const empty = state.library.length === 0;
  return (
    <div
      ref={setNodeRef}
      style={{
        // The drop target is the board itself. Lit, not outlined: an outline
        // is the one shape nothing else on the board has.
        background: isOver ? 'rgba(255, 246, 220, 0.16)' : 'transparent',
        padding: '6px 34px 22px', minHeight: 236, transition: 'background 180ms ease',
        display: 'flex', alignItems: 'flex-start', gap: 26,
      }}
    >
      {/* The card. Pinned a shade askew, like everything else up here. */}
      <div
        className="paper"
        style={{
          position: 'relative', flexShrink: 0, width: empty ? 300 : 236,
          padding: '20px 16px 14px', marginTop: 18,
          transform: `rotate(${tiltFor('shortlist-card', 1.6)}deg)`,
          transition: 'width 220ms ease',
        }}
      >
        <span aria-hidden style={{ position: 'absolute', top: 0, left: '50%', width: 0, height: 0 }}>
          <Pin size={18} colour="#a8791f" />
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div className="narrow" style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--soft)' }}>
            The shortlist
          </div>
          <div className="narrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
            {state.library.length} PULLED
          </div>
        </div>
        {empty ? (
          <div className="read" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--dim)', lineHeight: 1.5, marginTop: 8 }}>
            Search on the right to pull prints out onto the board. Costs nothing —
            nothing counts until the sheet is sealed.
          </div>
        ) : null}
      </div>

      {empty ? null : (
        // Setting `overflow-x` alone does not do what it looks like it does:
        // any non-visible value on one axis computes the OTHER axis to auto
        // as well, so a strip that only meant to scroll sideways was also
        // clipping the top off every pin and the bottom off every nameplate.
        // The vertical padding is what the cards lean and hang into.
        <div style={{ flexGrow: 1, display: 'flex', gap: 16, overflowX: 'auto', overflowY: 'hidden', paddingTop: 18, paddingBottom: 14, minHeight: 172, minWidth: 0 }}>
          {state.library.map((id) => {
            const p = state.pool.get(id);
            if (!p) return null;
            return (
              <div key={id} style={{ position: 'relative', flexShrink: 0 }}>
                <PlayerCard
                  player={p}
                  variant="library"
                  images={images}
                  obscurity={null}
                  compact
                  // Neutral until lock-in, like every card the player chose:
                  // the ring names the clubs that made a link hold.
                  ring={NEUTRAL}
                  tilt={tiltFor(`bench-${id}`, 2.6)}
                  pin="gold"
                />
                <button
                  onClick={() => onRemove(id)}
                  aria-label={`Put ${p.name} back`}
                  className="narrow"
                  style={{
                    position: 'absolute', top: -7, right: -7, width: 21, height: 21,
                    borderRadius: '50%', border: '1.5px solid var(--ink)',
                    background: 'var(--panel)', color: 'var(--ink)', cursor: 'pointer',
                    fontSize: 13, lineHeight: 1, padding: 0, zIndex: 3,
                  }}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
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
  // The slot that was filled a moment ago. It plays the landing and drives its
  // pin, then clears itself so a re-render cannot replay it.
  const [landed, setLanded] = useState<number | null>(null);
  // The takeover can be dismissed to look at the board again; the chain stays
  // locked either way, so this is presentation only.
  const [showResult, setShowResult] = useState(false);

  const prescribed = useMemo(() => puzzle.prescribedLinks ?? {}, [puzzle.prescribedLinks]);
  const links = useMemo(
    () => chainLinks(state.filled, pool, mode, prescribed),
    [state.filled, pool, mode, prescribed],
  );

  // The full result, computed once on lock-in. Everything the reveal shows —
  // the verdict, the score, the answers that were available — comes from here,
  // so the screen and the sheet cannot disagree about how it went.
  const result = useMemo(
    () => (state.submitted ? chainResult(state.filled, puzzle, players, pool) : null),
    [state.submitted, state.filled, puzzle, players, pool],
  );

  const blanks = puzzle.slots.filter((s) => s == null).length;

  useEffect(() => {
    if (landed === null) return;
    const t = setTimeout(() => setLanded(null), 900);
    return () => clearTimeout(t);
  }, [landed]);

  // The reveal runs left to right, one pick at a time, so the eye follows the
  // chain in the order it reads rather than everything arriving at once.
  const revealOrder = useMemo(() => {
    const order: Record<number, number> = {};
    let n = 0;
    puzzle.slots.forEach((given, i) => { if (given == null) order[i] = n++; });
    return order;
  }, [puzzle.slots]);

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
    const target = e.over?.id as string | undefined;
    if (!playerId || !target) return;

    if (target === 'bench') {
      const from = e.active.data.current?.fromSlot as string | undefined;
      if (from?.startsWith('slot:')) dispatch({ type: 'unplace', index: Number(from.slice(5)) });
      return;
    }
    if (target.startsWith('slot:')) {
      const i = Number(target.slice(5));
      dispatch({ type: 'place', index: i, playerId });
      setLanded(i);
    }
  }

  // The takeover owns the reveal. While it is up, the board behind it stays
  // exactly as the player left it — otherwise every link turns green
  // underneath the overlay and the sequence narrates something the player
  // could already read through the backdrop.
  const boardRevealed = state.submitted && !showResult;

  /**
   * The ring around each mounted print: the clubs that put the player there.
   *
   * A given wears its signature club from the first render, which leaks
   * nothing — it is on the board before you touch it.
   *
   * A player YOU placed wears plain ink until the chain is locked in. The ring
   * shows the clubs that made a link, so colouring it live would answer the
   * question being asked: two colours would mean "both links hold", one would
   * mean "half right", and the board would be a warmer/colder oracle.
   */
  const ringFor = (i: number): string => {
    const id = state.filled[i];
    if (!id) return NEUTRAL;
    if (puzzle.slots[i] != null) {
      return clubColour(SIGNATURE_CLUB[id] ?? pool.get(id)?.clubIds[0]);
    }
    if (!boardRevealed) return NEUTRAL;
    const held = [links[i - 1], links[i]].filter((l) => l?.made);
    if (held.length === 0) return 'var(--accent)';
    const [a, b] = held.map((l) => clubColour(l!.required ?? l!.clubs[0]));
    return b === undefined ? a! : splitRing(a!, b, 'var(--card-a)');
  };

  // Filled, not correct. Whether the chain holds is what the lock-in reveals.
  const complete = state.filled.every((id) => id !== null);
  const placed = state.filled.filter((id, i) => id !== null && puzzle.slots[i] == null).length;

  // The two ends, for the brief. Short names, because "Lionel Messi to Thibaut
  // Courtois" is a sentence and "Messi to Courtois" is an instruction.
  const ends = useMemo<[string, string]>(() => {
    const named = (id: string | null | undefined) => {
      const p = id ? pool.get(id) : undefined;
      return p ? plateName(p.id, p.name) : '?';
    };
    return [named(puzzle.slots[0]), named(puzzle.slots[puzzle.slots.length - 1])];
  }, [puzzle.slots, pool]);

  const namedClub = useMemo(() => {
    const first = Object.values(prescribed)[0];
    return first ? shortClubName(clubs[first]?.name ?? first) : undefined;
  }, [prescribed, clubs]);

  const sheet = useRef<HTMLDivElement>(null);

  return (
    // A stable id keeps dnd-kit's aria-describedby ids identical on the server
    // and the client. Without it every draggable hydrates with a mismatch
    // warning, because the id counter restarts per render pass.
    <DndContext id="chain" onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="sheet" style={{ height: '100vh', display: 'flex', minHeight: 0 }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 36px 22px', minWidth: 0, minHeight: 0, overflow: 'auto' }}>
            {/* The sheet is not the only thing on the board, and a single
                rectangle floating in the middle of a large surface is what
                made the screen read as empty. Two blank sheets underneath fix
                it more honestly than decoration would: the pins go through a
                stack rather than one leaf, there is a real edge and a real
                shadow behind the paper, and it is exactly what a board with
                work on it looks like. */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 1080, flexShrink: 0 }}>
              <div aria-hidden className="paper" style={{ position: 'absolute', inset: '10px -14px -16px -9px', transform: 'rotate(-0.7deg)', opacity: 0.75, zIndex: 0 }} />
              <div aria-hidden className="paper" style={{ position: 'absolute', inset: '5px -6px -8px -13px', transform: 'rotate(0.55deg)', opacity: 0.88, zIndex: 0 }} />
              <div
                ref={sheet}
                className="paper"
                style={{ position: 'relative', zIndex: 1, padding: '46px 40px 32px' }}
              >
              <SheetPins />
              <Masthead puzzle={puzzle} blanks={blanks} />

              <div style={{ padding: '46px 0 22px' }}>
                <ChainRow
                  fill={state.filled}
                  slots={puzzle.slots}
                  links={links}
                  mode={mode}
                  clubs={clubs}
                  images={images}
                  players={pool}
                  revealed={boardRevealed}
                  ringFor={ringFor}
                  depthFor={(i) => (boardRevealed ? result?.slots.find((sl) => sl.index === i)?.depth ?? null : null)}
                  revealDelayFor={(i) => 420 + (revealOrder[i] ?? 0) * 260}
                  focused={focused}
                  onFocus={setFocused}
                  landedIndex={landed}
                />
              </div>

              <Brief
                ends={ends}
                club={namedClub}
                mode={mode}
                placed={placed}
                blanks={blanks}
                sealed={state.submitted}
                onSeal={() => { setShowResult(true); dispatch({ type: 'submit' }); }}
              />
              </div>
            </div>
          </div>

          <Shortlist
            state={state}
            images={images}
            onRemove={(id) => dispatch({ type: 'library/remove', playerId: id })}
          />
        </div>

        <ChainSearch
          state={state}
          index={index}
          focused={focused}
          onAddToBench={(id) => dispatch({ type: 'library/add', playerId: id })}
          onPlace={(i, id) => { dispatch({ type: 'place', index: i, playerId: id }); setLanded(i); }}
        />
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

      <DragOverlay
        // Dropping ONTO a plate hands the animation over to the plate itself,
        // which lands the card and drives a pin through it. Letting dnd-kit
        // fly the clone home first would play two landings in a row.
        dropAnimation={overSlot ? null : { duration: 240, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }}
      >
        {dragging ? <DragPicture player={dragging} images={images} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
