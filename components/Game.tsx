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
  players, board, nations,
}: {
  players: Player[];
  board: Board;
  nations: Record<string, string>;
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
  const pct = Math.min(100, (score.squadChemistry / MAX_SQUAD_CHEMISTRY) * 100);
  const gatePct = (CHEMISTRY_GATE / MAX_SQUAD_CHEMISTRY) * 100;

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
  const obscurity = useMemo(() => {
    const scored = Object.entries(state.placed)
      .filter(([slot]) => board.seeded[slot] === undefined)
      .map(([slot, id]) => {
        const chosen = pool.get(id)!;
        const cls = formation.slots.find((s) => s.id === slot)!.position;
        const field = players.filter((p) => p.positions.includes(cls));
        return slotObscurityScore(chosen, field);
      });
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  }, [state.placed, board.seeded, pool, formation, players]);

  const rejection = state.lastRejection;

  return (
    <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
            <span className="cond" style={{ fontWeight: 700, fontSize: 22, color: 'var(--green)' }}>{score.squadChemistry}</span>
            <div style={{ position: 'relative', width: 180, height: 9, background: 'var(--panel-2)', borderRadius: 5 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg, #2f9e5c, var(--green))', borderRadius: 5, transition: 'width 220ms ease' }} />
              <div style={{ position: 'absolute', left: `${gatePct}%`, top: -4, bottom: -4, width: 2, background: 'var(--text)' }} />
            </div>
            <span className="cond" style={{ fontWeight: 600, fontSize: 12, color: 'var(--dim)' }}>{CHEMISTRY_GATE} TO SOLVE</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            {rejection ? (
              <span style={{ fontSize: 13, color: '#e07a6a' }}>
                {rejection.reason === 'position'
                  ? 'Wrong position for that slot'
                  : `No link to ${rejection.failedEdges.map((k) => k.split('|').find((s) => s !== rejection.slotId)).join(', ')}`}
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
          <Library state={state} nations={nations} onRemove={(id) => dispatch({ type: 'library/remove', playerId: id })} />

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
              <Pitch state={state} nations={nations} focusedSlot={focusedSlot} onFocus={setFocusedSlot} />
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
        {dragging ? <PlayerCard player={dragging} variant="library" nations={nations} revealFame={false} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
