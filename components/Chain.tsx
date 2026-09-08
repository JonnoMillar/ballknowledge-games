'use client';
import { useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DndContext, DragOverlay, useDroppable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import PlayerCard from './PlayerCard';
import ChainSearch from './ChainSearch';
import ClubBadge, { shortClubName } from './ClubBadge';
import type { ClubView } from '../src/lib/clubs';
import type { SlotDepth } from '../src/lib/chain/score';
import { initChain, chainReduce } from '../src/game/chainState';
import { chainLinks, chainProgress } from '../src/lib/chain/score';
import type { ChainLink } from '../src/lib/chain/score';
import DepthGauge, { useCountUp } from './DepthGauge';
import LockIn from './LockIn';
import { chainResult } from '../src/lib/chain/result';
import { buildIndex } from '../src/lib/search/index';
import type { ChainPuzzle } from '../src/lib/chain/types';
import type { LinkColour, Player } from '../src/lib/chemistry/types';

const STROKE: Record<LinkColour, string> = {
  green: 'var(--green)',
  hyper: 'var(--gold-light)',
  orange: 'var(--gold)',
  red: 'var(--link-red)',
};

/**
 * The connector between two slots.
 *
 * IT SHOWS NOTHING UNTIL THE CHAIN IS LOCKED IN. A board that lights a link
 * green the moment it is satisfied is a board with no risk on it: you try
 * names until the lights come on, and the lock-in is a formality you perform
 * after already knowing the answer. Withholding the verdict is what makes the
 * commitment cost something, so before `revealed` every link looks identical
 * whether it is perfect or nonsense.
 *
 * After the reveal it shows what the link ACTUALLY is, and in club mode it
 * names the club that made it. That is the whole point of the mode: a
 * nation-plus-league link is real but invisible, with nothing to point at,
 * whereas "these two both played for Manchester United" is an explanation the
 * player can see and argue with.
 */
function Link({ link, mode, clubs, revealed }: {
  link: ChainLink;
  mode: 'chemistry' | 'clubs';
  clubs: Record<string, ClubView>;
  revealed: boolean;
}) {
  const colour = revealed ? link.colour : null;
  const made = revealed && link.made;
  // A prescribed club is part of the puzzle, not part of the reveal: it is
  // shown from the first render, on an empty link, because it is the rule the
  // player is being asked to satisfy. A discovered club is the opposite and
  // stays hidden until the lock-in.
  const via = link.required ?? (mode === 'clubs' && made ? link.clubs[0] : undefined);
  const width = mode === 'clubs' || link.required ? 116 : 74;

  return (
    <div style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <div
        style={{
          width: '100%', height: 5, borderRadius: 3,
          background: made
            ? 'var(--green)'
            : colour
              ? STROKE[colour]
              : link.required
                // A demanded link reads as a rule waiting to be met, not as an
                // empty gap, so it is drawn in the colour that means "stated".
                ? 'repeating-linear-gradient(90deg, var(--gold) 0 5px, transparent 5px 10px)'
                : 'repeating-linear-gradient(90deg, #33455f 0 4px, transparent 4px 9px)',
          boxShadow: made ? '0 0 12px rgba(94,224,138,0.6)' : 'none',
          transition: 'background 200ms ease, box-shadow 200ms ease',
        }}
      />

      {via ? (
        // Badge above, name below. An inline pill truncated every long name to
        // "MANCHESTER ..." — which on a board holding both United and City is
        // worse than useless, because the link stops identifying itself. The
        // name is the payload, so it gets the full width and wraps instead.
        <span
          title={clubs[via]?.name ?? via}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%' }}
        >
          <ClubBadge clubId={via} club={clubs[via]} size={20} />
          <span
            className="cond"
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1.15,
              color: link.required && !made ? 'var(--gold)' : 'var(--text)',
              textAlign: 'center', textWrap: 'balance',
            }}
          >
            {shortClubName(clubs[via]?.name ?? via).toUpperCase()}
          </span>
        </span>
      ) : (
        <span
          className="cond"
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            color: colour ? STROKE[colour] : 'var(--dim)',
          }}
        >
          {!revealed ? '?' : mode === 'clubs' ? (colour ? 'NO CLUB' : '—') : colour ? colour.toUpperCase() : '—'}
        </span>
      )}
    </div>
  );
}

function Slot({
  index, player, given, focused, depth, revealed, revealDelay, nations, images, onFocus,
}: {
  index: number;
  player: Player | undefined;
  given: boolean;
  focused: boolean;
  /** How deep this pick dug. Withheld from the card until `revealed`. */
  depth: SlotDepth | null;
  revealed: boolean;
  revealDelay: number;
  nations: Record<string, string>;
  images: Record<string, string>;
  onFocus: (i: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}`, disabled: given });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
      <div ref={setNodeRef}>
        {player ? (
          <div onClick={() => !given && onFocus(index)}>
            <PlayerCard
              player={player}
              variant={given ? 'given' : 'found'}
              slotId={`slot:${index}`}
              nations={nations}
              images={images}
              obscurity={revealed && depth ? depth.score : null}
              revealDelay={revealed ? revealDelay : undefined}
            />
          </div>
        ) : (
          // A real button, not a clickable div. An empty slot is the primary
          // control on this screen and was unreachable by keyboard entirely.
          <button
            type="button"
            onClick={() => onFocus(index)}
            aria-label={`Choose a player for slot ${index + 1}`}
            className="card-shape"
            style={{
              width: 108, height: 140, cursor: 'pointer', padding: 0,
              border: `2px dashed ${focused ? 'var(--green)' : 'var(--slot-border)'}`,
              background: isOver ? 'rgba(94,224,138,0.14)' : 'rgba(11,16,28,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: focused ? '0 0 0 5px rgba(94,224,138,0.14)' : 'none',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={focused ? 'var(--green)' : '#33455f'} strokeWidth="1.6" aria-hidden>
              <circle cx="12" cy="8" r="3.6" />
              <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
            </svg>
          </button>
        )}
      </div>
      <span
        className="cond"
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
          color: given ? 'var(--green)' : focused ? 'var(--green)' : 'var(--muted)',
        }}
      >
        {given ? 'GIVEN' : revealed ? 'FOUND' : player ? 'PLACED' : 'FIND'}
      </span>
      {revealed && depth ? <DepthGauge depth={depth} delay={revealDelay} /> : null}
    </div>
  );
}

function Bench({
  state, nations, images, onRemove,
}: {
  state: ReturnType<typeof initChain>;
  nations: Record<string, string>;
  images: Record<string, string>;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });
  return (
    <div
      ref={setNodeRef}
      style={{
        borderTop: '1px solid var(--line)', padding: '14px 26px',
        background: isOver ? 'rgba(94,224,138,0.06)' : 'transparent',
        minHeight: 152,
      }}
    >
      <div className="cond" style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: 10 }}>
        BENCH · {state.library.length}
      </div>
      {state.library.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--dim)' }}>
          Search on the right to gather candidates here. Costs nothing.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {state.library.map((id) => {
            const p = state.pool.get(id);
            if (!p) return null;
            return (
              <div key={id} style={{ position: 'relative', flexShrink: 0 }}>
                <PlayerCard player={p} variant="library" nations={nations} images={images} obscurity={null} compact />
                <button
                  onClick={() => onRemove(id)}
                  aria-label={`Remove ${p.name} from bench`}
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                    borderRadius: '50%', border: '1px solid var(--border)',
                    background: 'var(--panel)', color: 'var(--soft)', cursor: 'pointer',
                    fontSize: 13, lineHeight: 1, padding: 0,
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

/**
 * The final score. Mounts only once the chain is locked in.
 *
 * Obscurity is deliberately absent from the header until then. Shown live it
 * becomes a dial to optimise against mid-solve, which turns the search box
 * into a warmer/colder oracle and quietly leaks how obscure a name is before
 * you commit to it.
 */
function FinalScore({ value }: { value: number }) {
  const shown = useCountUp(value, 900, 900);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span className="cond" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', color: 'var(--muted)' }}>
        OBSCURITY
      </span>
      <span
        className="cond"
        style={{
          fontWeight: 700, fontSize: 30, lineHeight: 1, color: 'var(--gold)',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 18px rgba(240,180,41,0.45)',
        }}
      >
        {shown}
      </span>
    </div>
  );
}

export default function Chain({
  players, puzzle, nations, images, clubs,
}: {
  players: Player[];
  puzzle: ChainPuzzle;
  nations: Record<string, string>;
  images: Record<string, string>;
  clubs: Record<string, ClubView>;
}) {
  const mode = puzzle.mode ?? 'chemistry';
  const pool = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const index = useMemo(() => buildIndex(players), [players]);

  const [state, dispatch] = useReducer(chainReduce, undefined, () => initChain(puzzle, pool));
  const [focused, setFocused] = useState<number | null>(null);
  const [dragging, setDragging] = useState<Player | null>(null);
  // The takeover can be dismissed to look at the board again; the chain stays
  // locked either way, so this is presentation only.
  const [showResult, setShowResult] = useState(false);

  const prescribed = useMemo(() => puzzle.prescribedLinks ?? {}, [puzzle.prescribedLinks]);
  const links = useMemo(
    () => chainLinks(state.filled, pool, mode, prescribed),
    [state.filled, pool, mode, prescribed],
  );
  const progress = chainProgress(links);

  // The full result, computed once on lock-in. Everything the reveal shows —
  // the verdict, the score, the answers that were available — comes from here,
  // so the screen and the header cannot disagree about how it went.
  const result = useMemo(
    () => (state.submitted ? chainResult(state.filled, puzzle, players, pool) : null),
    [state.submitted, state.filled, puzzle, players, pool],
  );

  const blanks = puzzle.slots.filter((s) => s == null).length;

  // A club-mode link is wider than a chemistry one, and a long chain of them
  // overflowed the column and clipped the end cards off both edges. Scale the
  // row down to whatever space is left rather than letting it spill.
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowScale, setRowScale] = useState(1);
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const fit = () => {
      const avail = el.parentElement?.getBoundingClientRect().width ?? 0;
      const natural = el.scrollWidth;
      setRowScale(natural > 0 ? Math.min(1, (avail - 40) / natural) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [state.filled.length, mode]);

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

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const playerId = e.active.data.current?.playerId as string | undefined;
    const target = e.over?.id as string | undefined;
    if (!playerId || !target) return;

    if (target === 'bench') {
      const from = e.active.data.current?.fromSlot as string | undefined;
      if (from?.startsWith('slot:')) dispatch({ type: 'unplace', index: Number(from.slice(5)) });
      return;
    }
    if (target.startsWith('slot:')) {
      dispatch({ type: 'place', index: Number(target.slice(5)), playerId });
    }
  }

  // The takeover owns the reveal. While it is up, the board behind it stays
  // exactly as the player left it — otherwise the header prints the score and
  // every link turns green underneath the overlay, and the sequence is
  // narrating something the player could already read through the backdrop.
  const boardRevealed = state.submitted && !showResult;

  // Filled, not correct. Whether the chain holds is what the lock-in reveals.
  const complete = state.filled.every((id) => id !== null);
  const placed = state.filled.filter((id, i) => id !== null && puzzle.slots[i] == null).length;

  return (
    // A stable id keeps dnd-kit's aria-describedby ids identical on the
    // server and the client. Without it every draggable hydrates with a
    // mismatch warning, because the id counter restarts per render pass.
    <DndContext id="chain" onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '16px 26px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div className="cond" style={{ fontWeight: 700, fontSize: 26, lineHeight: 1 }}>CHAIN {puzzle.id}</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>
              {mode === 'clubs' ? 'Every link a shared club' : 'Every link green'}
              {Object.keys(prescribed).length > 0 ? ' · one club named for you' : ''} · {blanks} to find
            </div>
          </div>

          {/* Progress the player can see is progress that cannot leak the
              answer: how many slots are filled, never how many links hold. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cond" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', color: 'var(--muted)' }}>
              {boardRevealed ? 'LINKS' : 'FILLED'}
            </span>
            <span
              className="cond"
              style={{
                fontWeight: 700, fontSize: 22,
                color: boardRevealed && progress.solved ? 'var(--green)' : 'var(--text)',
                textShadow: boardRevealed && progress.solved ? '0 0 14px rgba(94,224,138,0.75)' : 'none',
                transition: 'color 220ms ease, text-shadow 220ms ease',
              }}
            >
              {boardRevealed ? `${progress.made}/${progress.total}` : `${placed}/${blanks}`}
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              {links.map((l) => (
                <span
                  key={l.index}
                  style={{
                    width: 26, height: 7, borderRadius: 4,
                    background: !boardRevealed
                      ? 'var(--panel-2)'
                      : l.made ? 'var(--green)' : l.colour ? STROKE[l.colour] : 'var(--panel-2)',
                    boxShadow: boardRevealed && l.made ? '0 0 10px rgba(94,224,138,0.55)' : 'none',
                    transition: 'background 200ms ease, box-shadow 200ms ease',
                    animation: boardRevealed
                      ? `link-settle 460ms ease-out ${l.index * 90}ms both`
                      : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22 }}>
            {result && boardRevealed ? <FinalScore value={result.score} /> : null}
            <button
              onClick={() => { setShowResult(true); dispatch({ type: 'submit' }); }}
              disabled={!complete || state.submitted}
              style={{
                background: complete && !state.submitted ? 'var(--green)' : 'var(--panel-2)',
                color: complete && !state.submitted ? 'var(--bg)' : 'var(--dim)',
                border: 'none', borderRadius: 5, padding: '11px 22px',
                fontWeight: 700, fontSize: 14, letterSpacing: '0.04em',
                cursor: complete && !state.submitted ? 'pointer' : 'not-allowed',
              }}
            >
              {state.submitted ? 'LOCKED IN' : 'LOCK IN CHAIN'}
            </button>
          </div>
        </header>

        <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26, minWidth: 0 }}>
              <div
                ref={rowRef}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 0,
                  transform: `scale(${rowScale})`, transformOrigin: 'center center',
                }}
              >
                {state.filled.map((id, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && (
                      <div style={{ marginBottom: 34 }}>
                        <Link link={links[i - 1]!} mode={mode} clubs={clubs} revealed={boardRevealed} />
                      </div>
                    )}
                    <Slot
                      index={i}
                      player={id ? pool.get(id) : undefined}
                      given={puzzle.slots[i] != null}
                      focused={focused === i}
                      depth={boardRevealed ? result?.slots.find((sl) => sl.index === i)?.depth ?? null : null}
                      revealed={boardRevealed}
                      revealDelay={420 + (revealOrder[i] ?? 0) * 260}
                      nations={nations}
                      images={images}
                      onFocus={setFocused}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Bench
              state={state}
              nations={nations}
              images={images}
              onRemove={(id) => dispatch({ type: 'library/remove', playerId: id })}
            />
          </div>

          <ChainSearch
            state={state}
            index={index}
            nations={nations}
            focused={focused}
            onAddToBench={(id) => dispatch({ type: 'library/add', playerId: id })}
            onPlace={(i, id) => dispatch({ type: 'place', index: i, playerId: id })}
          />
        </div>
      </div>

      {result && showResult ? (
        <LockIn
          result={result}
          chainId={puzzle.id}
          pool={pool}
          onDismiss={() => setShowResult(false)}
        />
      ) : null}

      <DragOverlay>
        {dragging ? <PlayerCard player={dragging} variant="library" nations={nations} images={images} obscurity={null} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
