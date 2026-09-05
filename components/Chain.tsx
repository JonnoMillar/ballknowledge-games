'use client';
import { useMemo, useReducer, useState } from 'react';
import { DndContext, DragOverlay, useDroppable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import PlayerCard from './PlayerCard';
import ChainSearch from './ChainSearch';
import { initChain, chainReduce } from '../src/game/chainState';
import { chainLinks, chainProgress, chainSlotObscurity, chainObscurity, isGreen } from '../src/lib/chain/score';
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
 * It shows the colour the link ACTUALLY has, never a colour it is supposed to
 * reach. Nothing on screen tells the player what would work — that is the
 * puzzle. A link with an empty end is drawn as a dashed gap.
 */
function Link({ colour }: { colour: LinkColour | null }) {
  const good = isGreen(colour);
  return (
    <div style={{ width: 74, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <div
        style={{
          width: '100%', height: 5, borderRadius: 3,
          background: colour
            ? STROKE[colour]
            : 'repeating-linear-gradient(90deg, #33455f 0 4px, transparent 4px 9px)',
          boxShadow: good ? '0 0 12px rgba(94,224,138,0.6)' : 'none',
          transition: 'background 200ms ease, box-shadow 200ms ease',
        }}
      />
      <span
        className="cond"
        style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
          color: colour ? STROKE[colour] : 'var(--dim)',
        }}
      >
        {colour ? colour.toUpperCase() : '—'}
      </span>
    </div>
  );
}

function Slot({
  index, player, given, focused, obscurity, nations, images, onFocus,
}: {
  index: number;
  player: Player | undefined;
  given: boolean;
  focused: boolean;
  obscurity: number | null;
  nations: Record<string, string>;
  images: Record<string, string>;
  onFocus: (i: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}`, disabled: given });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
      <div ref={setNodeRef} onClick={() => !given && onFocus(index)}>
        {player ? (
          <PlayerCard
            player={player}
            variant={given ? 'given' : 'found'}
            slotId={`slot:${index}`}
            nations={nations}
            images={images}
            obscurity={given ? null : obscurity}
          />
        ) : (
          <div
            className="card-shape"
            style={{
              width: 108, height: 140, cursor: 'pointer',
              border: `2px dashed ${focused ? 'var(--green)' : 'var(--slot-border)'}`,
              background: isOver ? 'rgba(94,224,138,0.14)' : 'rgba(11,16,28,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: focused ? '0 0 0 5px rgba(94,224,138,0.14)' : 'none',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={focused ? 'var(--green)' : '#33455f'} strokeWidth="1.6">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
            </svg>
          </div>
        )}
      </div>
      <span
        className="cond"
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
          color: given ? 'var(--green)' : focused ? 'var(--green)' : 'var(--muted)',
        }}
      >
        {given ? 'GIVEN' : 'FIND'}
      </span>
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

export default function Chain({
  players, puzzle, nations, images,
}: {
  players: Player[];
  puzzle: ChainPuzzle;
  nations: Record<string, string>;
  images: Record<string, string>;
}) {
  const pool = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const index = useMemo(() => buildIndex(players), [players]);

  const [state, dispatch] = useReducer(chainReduce, undefined, () => initChain(puzzle, pool));
  const [focused, setFocused] = useState<number | null>(null);
  const [dragging, setDragging] = useState<Player | null>(null);

  const links = useMemo(() => chainLinks(state.filled, pool), [state.filled, pool]);
  const progress = chainProgress(links);

  const perSlot = useMemo(
    () => chainSlotObscurity(state.filled, puzzle.slots, players, pool),
    [state.filled, puzzle.slots, players, pool],
  );
  const obscurity = chainObscurity(perSlot);
  const blanks = puzzle.slots.filter((s) => s == null).length;

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

  const solved = progress.solved;

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
              Every link green · {blanks} to find
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span className="cond" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', color: 'var(--muted)' }}>OBSCURITY</span>
            <span className="cond" style={{ fontWeight: 700, fontSize: 22, color: 'var(--gold)' }}>{obscurity}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cond" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', color: 'var(--muted)' }}>LINKS</span>
            <span
              className="cond"
              style={{
                fontWeight: 700, fontSize: 22,
                color: solved ? 'var(--green)' : 'var(--text)',
                textShadow: solved ? '0 0 14px rgba(94,224,138,0.75)' : 'none',
                transition: 'color 220ms ease, text-shadow 220ms ease',
              }}
            >
              {progress.made}/{progress.total}
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              {links.map((l) => (
                <span
                  key={l.index}
                  style={{
                    width: 26, height: 7, borderRadius: 4,
                    background: isGreen(l.colour) ? 'var(--green)' : l.colour ? STROKE[l.colour] : 'var(--panel-2)',
                    boxShadow: isGreen(l.colour) ? '0 0 10px rgba(94,224,138,0.55)' : 'none',
                    transition: 'background 200ms ease, box-shadow 200ms ease',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => dispatch({ type: 'submit' })}
              disabled={!solved || state.submitted}
              style={{
                background: solved && !state.submitted ? 'var(--green)' : 'var(--panel-2)',
                color: solved && !state.submitted ? 'var(--bg)' : 'var(--dim)',
                border: 'none', borderRadius: 5, padding: '11px 22px',
                fontWeight: 700, fontSize: 14, letterSpacing: '0.04em',
                cursor: solved && !state.submitted ? 'pointer' : 'not-allowed',
              }}
            >
              {state.submitted ? 'LOCKED IN' : 'LOCK IN CHAIN'}
            </button>
          </div>
        </header>

        <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', padding: 26 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                {state.filled.map((id, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <div style={{ marginBottom: 34 }}><Link colour={links[i - 1]!.colour} /></div>}
                    <Slot
                      index={i}
                      player={id ? pool.get(id) : undefined}
                      given={puzzle.slots[i] != null}
                      focused={focused === i}
                      obscurity={perSlot[i] ?? null}
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

      <DragOverlay>
        {dragging ? <PlayerCard player={dragging} variant="library" nations={nations} images={images} obscurity={null} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
