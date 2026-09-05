'use client';
import { useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import Library from './Library';
import Pitch from './Pitch';
import SearchPanel from './SearchPanel';
import PlayerCard from './PlayerCard';
import { initState, reduce } from '../src/game/state';
import { chemistry } from '../src/game/derive';
import { FORMATIONS } from '../src/lib/puzzle/formations';
import { CHEMISTRY_GATE, MAX_SQUAD_CHEMISTRY } from '../src/lib/chemistry/score';
import { buildIndex } from '../src/lib/search/index';
import { slotObscurityScore } from '../src/lib/fame/obscurity';
import type { Player } from '../src/lib/chemistry/types';
import type { Board } from '../src/lib/puzzle/types';

export default function Game({
  players, board, nations, images,
}: {
  players: Player[];
  board: Board;
  nations: Record<string, string>;
  images: Record<string, string>;
}) {
  const pool = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const formation = FORMATIONS[board.formationId]!;
  const index = useMemo(() => buildIndex(players), [players]);

  const [state, dispatch] = useReducer(reduce, undefined, () => initState(board, formation, pool));
  const [focusedSlot, setFocusedSlot] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Player | null>(null);

  // Fit the fixed-size pitch into whatever the middle column has left.
  const pitchWrapRef = useRef<HTMLDivElement>(null);
  const [pitchScale, setPitchScale] = useState(1);
  useLayoutEffect(() => {
    const el = pitchWrapRef.current;
    if (!el) return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      // 24px of breathing room, and never scale up past 1.
      setPitchScale(Math.min(1, (width - 24) / 880, (height - 24) / 700));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const score = chemistry(state);
  /**
   * Chemistry is never shown above 100. The scale internally runs to 110 so a
   * hyper link can absorb a weak one elsewhere, but that headroom is a
   * mechanic, not a number the player should be reading. At 100 the bar fills
   * and glows; beyond it, nothing further changes.
   */
  const shownChem = Math.min(CHEMISTRY_GATE, score.squadChemistry);
  const pct = (shownChem / CHEMISTRY_GATE) * 100;
  const full = score.squadChemistry >= CHEMISTRY_GATE;

  function onDragStart(e: DragStartEvent) {
    const id = e.active.data.current?.playerId as string | undefined;
    setDragging(id ? pool.get(id) ?? null : null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const playerId = e.active.data.current?.playerId as string | undefined;
    const target = e.over?.id as string | undefined;
    if (!playerId || !target) return;

    if (target === 'library') {
      const from = e.active.data.current?.fromSlot as string | undefined;
      if (from) dispatch({ type: 'unplace', slotId: from });
      return;
    }
    dispatch({ type: 'place', slotId: target, playerId });
  }

  // Obscurity is only meaningful once a player is placed, so it is computed
  // over placed non-seeded slots against that slot's position-eligible field.
  // Position-eligible fields, computed once. slotObscurityScore ranks a pick
  // against everyone who could legally have gone there.
  const fields = useMemo(() => {
    const byClass = new Map<string, Player[]>();
    for (const slot of formation.slots) {
      if (!byClass.has(slot.position)) {
        byClass.set(slot.position, players.filter((p) => p.positions.includes(slot.position)));
      }
    }
    return byClass;
  }, [formation, players]);

  const slotObscurity = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [slot, id] of Object.entries(state.placed)) {
      if (board.seeded[slot] !== undefined) continue;
      const chosen = pool.get(id);
      const cls = formation.slots.find((s) => s.id === slot)?.position;
      if (!chosen || !cls) continue;
      out[slot] = slotObscurityScore(chosen, fields.get(cls) ?? []);
    }
    return out;
  }, [state.placed, board.seeded, pool, formation, fields]);

  const obscurityFor = (slotId: string): number | null => slotObscurity[slotId] ?? null;

  const obscurity = useMemo(() => {
    const vals = Object.values(slotObscurity);
    return vals.length === 0 ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [slotObscurity]);

  const rejection = state.lastRejection;

  return (
    <DndContext id="xi" onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '16px 26px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div className="cond" style={{ fontWeight: 700, fontSize: 26, lineHeight: 1 }}>BOARD {board.id}</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>4-3-3 · {Object.keys(board.seeded).length} given</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span className="cond" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', color: 'var(--muted)' }}>OBSCURITY</span>
            <span className="cond" style={{ fontWeight: 700, fontSize: 22, color: 'var(--gold)' }}>{obscurity}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cond" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', color: 'var(--muted)' }}>CHEMISTRY</span>
            <span
              className="cond"
              style={{
                fontWeight: 700, fontSize: 22,
                color: full ? 'var(--green)' : 'var(--text)',
                textShadow: full ? '0 0 14px rgba(94,224,138,0.75)' : 'none',
                transition: 'color 220ms ease, text-shadow 220ms ease',
              }}
            >
              {shownChem}
            </span>
            <div
              style={{
                position: 'relative', width: 180, height: 9, borderRadius: 5,
                background: 'var(--panel-2)',
                boxShadow: full ? '0 0 12px rgba(94,224,138,0.55)' : 'none',
                transition: 'box-shadow 260ms ease',
              }}
            >
              <div
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
                  borderRadius: 5, transition: 'width 220ms ease, background 260ms ease',
                  background: full
                    ? 'linear-gradient(90deg, var(--green), #b6ff9c, var(--green))'
                    : 'linear-gradient(90deg, #2f9e5c, var(--green))',
                }}
              />
            </div>
            <span className="cond" style={{ fontWeight: 600, fontSize: 12, color: full ? 'var(--green)' : 'var(--dim)' }}>
              {full ? 'FULL' : `${CHEMISTRY_GATE} TO SOLVE`}
            </span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            {rejection ? (
              <span style={{ fontSize: 13, color: '#e5b566' }}>
                {rejection.reason === 'position'
                  ? `Out of position at ${rejection.slotId} — costs chemistry`
                  : `Weak link to ${rejection.failedEdges.map((k) => k.split('|').find((sl) => sl !== rejection.slotId)).join(', ')}`}
              </span>
            ) : null}
            <button
              onClick={() => dispatch({ type: 'submit' })}
              disabled={!score.solved || state.submitted}
              style={{
                background: score.solved && !state.submitted ? 'var(--green)' : 'var(--panel-2)',
                color: score.solved && !state.submitted ? 'var(--bg)' : 'var(--dim)',
                border: 'none', borderRadius: 5, padding: '11px 22px',
                fontWeight: 700, fontSize: 14, letterSpacing: '0.04em',
                cursor: score.solved && !state.submitted ? 'pointer' : 'not-allowed',
              }}
            >
              {state.submitted ? 'LOCKED IN' : 'LOCK IN XI'}
            </button>
          </div>
        </header>

        <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
          <Library state={state} nations={nations} images={images} onRemove={(id) => dispatch({ type: 'library/remove', playerId: id })} />

          {/* The pitch is authored at a fixed 880x700 so the slot and link
              geometry stays exactly as designed. Scale it to whatever space is
              left rather than letting it overflow — at narrow widths the wings
              were being clipped off the right edge entirely. */}
          <div ref={pitchWrapRef} style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(-50%, -50%) scale(${pitchScale})`,
                transformOrigin: 'center center',
              }}
            >
              <Pitch state={state} nations={nations} images={images} obscurityFor={obscurityFor} perSlotChem={score.perSlot} focusedSlot={focusedSlot} onFocus={setFocusedSlot} />
            </div>
          </div>

          <SearchPanel
            state={state}
            index={index}
            nations={nations}
            focusedSlot={focusedSlot}
            onAddToBench={(id) => dispatch({ type: 'library/add', playerId: id })}
            onPlace={(slot, id) => dispatch({ type: 'place', slotId: slot, playerId: id })}
          />
        </div>
      </div>

      <DragOverlay>
        {dragging ? <PlayerCard player={dragging} variant="library" nations={nations} images={images} obscurity={null} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
