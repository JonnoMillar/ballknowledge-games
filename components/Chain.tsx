'use client';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import ChainBoard from './ChainBoard';
import SearchSheet from './SearchSheet';
import Sticker from './Sticker';
import { useSwing } from './swing';
import { shortClubName } from './ClubBadge';
import type { ClubView } from '../src/lib/clubs';
import { initChain, chainReduce } from '../src/game/chainState';
import { neighboursOf } from '../src/lib/chain/score';
import LockIn from './LockIn';
import { buildIndex, type SearchIndex } from '../src/lib/search/index';
import type { ChainPuzzle } from '../src/lib/chain/types';
import { blankLinks, decodeNames, type Given, type NameEntry, type NameRow, type SealResponse } from '../src/lib/chain/client';
import { clubColour, splitRing } from '../src/lib/club-colours';
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
function DragSticker({ player, image }: { player: NameEntry; image: PortraitImage | undefined }) {
  const ref = useSwing({ active: true, scale: 1.05 });
  return (
    <div ref={ref} style={{ pointerEvents: 'none' }}>
      <Sticker player={player} image={image} ground={NEUTRAL_GROUND} lifted />
    </div>
  );
}

/** The sealed board, as the server judged it, plus what the reveal draws. */
interface Sealed extends SealResponse {
  pool: Map<string, Player>;
}

export default function Chain({
  puzzle, givens, images: givenImages, clubs: givenClubs,
}: {
  puzzle: ChainPuzzle;
  givens: Record<string, Given>;
  /** Pictures for the givens. The album brings everyone else's. */
  images: Record<string, PortraitImage>;
  /** The clubs the board names up front. The seal brings the rest. */
  clubs: Record<string, ClubView>;
}) {
  const mode = puzzle.mode ?? 'chemistry';
  const closed = puzzle.closed ?? false;
  const clues = useMemo(() => puzzle.clues ?? {}, [puzzle.clues]);
  const completion = puzzle.scoring === 'completion';
  const prescribed = useMemo(() => puzzle.prescribedLinks ?? {}, [puzzle.prescribedLinks]);

  // The album. Names only, fetched once the board is up. Until it lands the
  // pool is the givens, which is enough to draw the board.
  const [album, setAlbum] = useState<Map<string, NameEntry> | null>(null);
  const [albumFailed, setAlbumFailed] = useState(false);
  const index = useMemo<SearchIndex<NameEntry> | null>(() => (album ? buildIndex([...album.values()]) : null), [album]);

  const [state, dispatch] = useReducer(chainReduce, undefined, () => initChain(
    puzzle,
    new Map(Object.values(givens).map((g) => [g.id, { id: g.id, name: g.name }])),
  ));

  useEffect(() => {
    let live = true;
    fetch('/api/names')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ players: NameRow[] }>; })
      .then((data) => {
        if (!live) return;
        const map = new Map(decodeNames(data.players).map((e) => [e.id, e]));
        setAlbum(map);
        dispatch({ type: 'pool/set', pool: map });
      })
      .catch(() => { if (live) setAlbumFailed(true); });
    return () => { live = false; };
  }, []);

  const images = useMemo<Record<string, PortraitImage>>(() => {
    const out: Record<string, PortraitImage> = { ...givenImages };
    if (album) for (const e of album.values()) if (e.image) out[e.id] = e.image;
    return out;
  }, [givenImages, album]);

  const [focused, setFocused] = useState<number | null>(null);
  const [dragging, setDragging] = useState<NameEntry | null>(null);
  // A tap is a tap. Without a distance to travel first, the pointer sensor
  // takes every pointerdown as the start of a drag and the click never
  // reaches the sticker, so a placed player could not be swapped or removed.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [overSlot, setOverSlot] = useState(false);
  // The slot filled a moment ago plays the stick-down, then clears itself.
  const [landed, setLanded] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealError, setSealError] = useState<string | null>(null);
  const [sealed, setSealed] = useState<Sealed | null>(null);

  useEffect(() => {
    if (landed === null) return;
    const t = setTimeout(() => setLanded(null), 600);
    return () => clearTimeout(t);
  }, [landed]);

  const named = useCallback((id: string | null | undefined): NameEntry | null => {
    if (!id) return null;
    const e = album?.get(id);
    if (e) return e;
    const g = givens[id];
    return g ? { id: g.id, name: g.name, aliases: [] } : null;
  }, [album, givens]);

  const place = useCallback((i: number, id: string) => {
    dispatch({ type: 'place', index: i, playerId: id });
    setLanded(i);
    setFocused(null);
  }, []);

  function onDragStart(e: DragStartEvent) {
    const id = e.active.data.current?.playerId as string | undefined;
    setDragging(id ? named(id) : null);
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

  async function seal() {
    if (sealing || sealed) return;
    setSealing(true);
    setSealError(null);
    try {
      const res = await fetch('/api/seal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ board: puzzle.id, fill: state.filled }),
      });
      if (!res.ok) throw new Error(`The seal came back ${res.status}.`);
      const data = (await res.json()) as SealResponse;
      setSealed({ ...data, pool: new Map(data.players.map((p) => [p.id, p])) });
      dispatch({ type: 'submit' });
      setShowResult(true);
    } catch (err) {
      setSealError(err instanceof Error ? err.message : 'The seal did not go through.');
    } finally {
      setSealing(false);
    }
  }

  // While the takeover is up, the board behind it stays as the player left
  // it; otherwise the links would turn green under the overlay first.
  const boardRevealed = sealed !== null && !showResult;
  const links = useMemo(() => sealed?.links ?? blankLinks(puzzle), [sealed, puzzle]);
  const clubs = useMemo(() => ({ ...givenClubs, ...(sealed?.clubs ?? {}) }), [givenClubs, sealed]);

  /**
   * The ground behind each sticker: the clubs that put the player there.
   * A given wears its signature club from the start. A pick wears neutral
   * until the seal, because the ground would otherwise answer the question.
   */
  const groundFor = (i: number): string => {
    const id = state.filled[i];
    if (!id) return NEUTRAL_GROUND;
    const given = givens[id];
    if (given) return given.ground;
    if (!boardRevealed) return NEUTRAL_GROUND;
    const held = neighboursOf(i, state.filled.length, closed).map(({ link }) => links[link]).filter((l) => l?.made);
    if (held.length === 0) return 'var(--red)';
    const [a, b] = held.map((l) => clubColour(l!.required ?? l!.clubs[0]));
    return b === undefined ? a! : splitRing(a!, b, 'var(--sticker)');
  };

  const complete = state.filled.every((id) => id !== null);
  const blanks = puzzle.slots.filter((s) => s == null).length;
  const placed = state.filled.filter((id, i) => id !== null && puzzle.slots[i] == null).length;
  const taken = useMemo(() => new Set(state.filled.filter((id): id is string => id !== null)), [state.filled]);

  const plate = (id: string | null | undefined) => {
    const e = named(id);
    return e ? plateName(e.id, e.name) : '?';
  };
  const ends: [string, string] = [plate(puzzle.slots[0]), plate(puzzle.slots[puzzle.slots.length - 1])];
  const corners = closed ? puzzle.slots.flatMap((id) => (id ? [plate(id)] : [])) : undefined;
  const namedClub = useMemo(() => {
    const first = Object.values(prescribed)[0];
    return first ? shortClubName(clubs[first]?.name ?? first) : undefined;
  }, [prescribed, clubs]);
  const count = ['no', 'one', 'two', 'three', 'four', 'five'][blanks] ?? String(blanks);
  const grade = puzzle.difficulty ? puzzle.difficulty[0]!.toUpperCase() + puzzle.difficulty.slice(1) : null;

  // Who the focused slot sits between. Names only, never a hint at the link.
  const between = focused === null
    ? []
    : neighboursOf(focused, state.filled.length, closed)
        .map(({ slot }) => named(state.filled[slot]))
        .filter((e): e is NameEntry => e !== null)
        .map((e) => plateName(e.id, e.name));

  const close = useCallback(() => setFocused(null), []);

  return (
    <DndContext id="chain" sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
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
              players={state.pool}
              revealed={boardRevealed}
              groundFor={groundFor}
              focused={focused}
              onFocus={setFocused}
              landedIndex={landed}
              closed={closed}
              clues={clues}
              clueMetFor={(i) => (boardRevealed ? sealed?.result.slots.find((s) => s.index === i)?.clueMet ?? null : null)}
              interactive={!state.submitted}
            />

            <div className="actions">
              <button
                type="button"
                className="seal"
                disabled={!complete || state.submitted || sealing}
                onClick={seal}
              >
                {state.submitted ? 'Sealed' : sealing ? 'Sealing…' : 'Seal it'}
              </button>
              {sealError ? (
                <span className="actions__note actions__note--error">{sealError} Try again.</span>
              ) : albumFailed ? (
                <span className="actions__note actions__note--error">The album did not load. Reload the page.</span>
              ) : (
                <span className="actions__count">
                  {state.submitted ? 'One submission, and this was it.' : `${placed} of ${blanks} filled`}
                </span>
              )}
            </div>
          </div>
        </main>
      </div>

      <SearchSheet
        slot={state.submitted ? null : focused}
        between={between}
        current={focused === null ? null : named(state.filled[focused])}
        index={index}
        taken={taken}
        onPick={(id) => { if (focused !== null) place(focused, id); }}
        onRemove={() => { if (focused !== null) { dispatch({ type: 'unplace', index: focused }); setFocused(null); } }}
        onClose={close}
      />

      {sealed && showResult ? (
        <LockIn
          result={sealed.result}
          puzzle={puzzle}
          fill={state.filled}
          links={sealed.links}
          pool={sealed.pool}
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
