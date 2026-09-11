'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import PlayerCard from './PlayerCard';
import ClubBadge, { shortClubName } from './ClubBadge';
import { tiltFor } from './swing';
import Stamp from './Stamp';
import DepthColumn, { type ColumnSpec } from './DepthColumn';
import type { ChainLink } from '../src/lib/chain/score';
import type { SlotDepth } from '../src/lib/chain/score';
import type { ClubView } from '../src/lib/clubs';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * The chain itself, as it appears on the clipboard.
 *
 * ONE component draws it on the live board and again on the sealed sheet.
 * The reveal is supposed to be the same sheet with the answers filled in —
 * if it were a second implementation the two would drift within a week, and
 * the moment the player is meant to recognise ("that is my board, finished")
 * would quietly stop landing.
 */

/**
 * The connector between two slots.
 *
 * IT SHOWS NOTHING UNTIL THE CHAIN IS LOCKED IN. A board that lights a link
 * green the moment it is satisfied is a board with no risk on it: you try
 * names until the lights come on, and the lock-in is a formality you perform
 * after already knowing the answer. Before `revealed`, every link looks
 * identical whether it is perfect or nonsense.
 *
 * A PRESCRIBED club is the exception and is shown from the first render,
 * because it is not part of the answer — it is the rule the player is being
 * asked to satisfy, and a harder rule than the mode's own.
 */
function Connector({ link, mode, clubs, revealed, showRule, stamped }: {
  link: ChainLink;
  mode: 'chemistry' | 'clubs';
  clubs: Record<string, ClubView>;
  revealed: boolean;
  /**
   * False on the sealed sheet, where a length of red string is already
   * running between the pins. Two lines joining the same two cards is one
   * line too many, and the string is the better of them: it says held or
   * snapped by being taut or severed, which the rule could only say in
   * colour.
   */
  showRule: boolean;
  /**
   * The verdict on this link, as one of three states. `null` is the live
   * board: the connector reveals in place. On the sealed sheet the die comes
   * down one link at a time — `false` is a link the string has not reached
   * yet, which looks exactly as it did before lock-in, and `true` is the
   * stamp on it.
   */
  stamped: boolean | null;
}) {
  // A link the stamp has not reached yet must give nothing away: the sheet
  // is sealed, but the player has not been TOLD yet.
  const shown = revealed && stamped !== false;
  const made = shown && link.made;
  const named = link.required;
  const via = named ?? (shown && made && mode === 'clubs' ? link.clubs[0] : undefined);

  const rule = made
    ? '2.5px solid var(--green)'
    : shown
      ? '2px dashed var(--accent)'
      : named
        ? '2.5px solid var(--accent)'
        : '2px dotted rgba(26,20,16,0.42)';

  return (
    <div
      style={{
        flexGrow: 1, flexBasis: 74, minWidth: 44,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        paddingTop: 46, alignSelf: 'flex-start',
      }}
    >
      {showRule
        ? <div style={{ width: '100%', height: 0, borderTop: rule, transition: 'border-color 260ms ease' }} />
        : <div style={{ height: 2 }} />}
      {stamped ? (
        // The die, centred where the crest would have been. It overflows the
        // crest's box on purpose: nothing below it moves when it lands.
        <div style={{ position: 'relative', width: 28, height: 28 }}>
          <Stamp held={link.made} clubId={via} club={via ? clubs[via] : undefined} lean={tiltFor(`stamp-${link.clubs.join('-')}-${String(named)}`, 8)} />
        </div>
      ) : via ? (
        <ClubBadge clubId={via} club={clubs[via]} size={28} />
      ) : (
        <div className="slab" style={{ fontSize: 17, lineHeight: 1.2, color: shown ? 'var(--accent)' : 'rgba(26,20,16,0.34)' }}>
          {shown ? '✕' : '?'}
        </div>
      )}
      {stamped ? null : (
        <div
          className="narrow"
          title={via ? clubs[via]?.name ?? via : undefined}
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            textAlign: 'center', lineHeight: 1.25, textWrap: 'balance',
            color: made ? 'var(--green)' : shown ? 'var(--accent)' : named ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          {via
            ? shortClubName(clubs[via]?.name ?? via)
            : shown
              ? 'No club\nin common'.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)
              : <>Any<br />shared club</>}
        </div>
      )}
    </div>
  );
}

/** An empty plate: a mount with nothing in it yet. */
function EmptySlot({
  index, focused, isOver, tilt, onFocus,
}: {
  index: number;
  focused: boolean;
  isOver: boolean;
  tilt: number;
  onFocus: (i: number) => void;
}) {
  return (
    // A real button, not a clickable div. An empty slot is the primary control
    // on this screen and was once unreachable by keyboard entirely.
    <button
      type="button"
      onClick={() => onFocus(index)}
      aria-label={`Choose a player for slot ${index + 1}`}
      className="mount"
      style={{
        width: 116, padding: '5px 5px 0', display: 'block', textAlign: 'left',
        cursor: 'pointer', border: 'none', background: 'var(--card-a)',
        transform: `rotate(${tilt}deg)${isOver ? ' scale(1.045)' : ''}`,
        boxShadow: focused || isOver
          ? 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 2px 0 rgba(26,20,16,0.16), 0 0 0 4px rgba(179,52,31,0.30), 0 12px 22px rgba(26,20,16,0.24)'
          : undefined,
      }}
    >
      <span
        style={{
          display: 'flex', width: 106, height: 118,
          border: `2px dashed ${focused || isOver ? 'var(--accent)' : 'rgba(179,52,31,0.5)'}`,
          background: isOver ? 'rgba(179,52,31,0.13)' : 'var(--panel-2)',
          alignItems: 'center', justifyContent: 'center',
          transition: 'background 160ms ease, border-color 160ms ease',
        }}
      >
        <span
          className="slab"
          style={{
            fontSize: 40, lineHeight: 1, color: 'rgba(179,52,31,0.34)',
            transform: isOver ? 'scale(1.16)' : 'none',
            transition: 'transform 200ms cubic-bezier(0.2,1.3,0.4,1)',
          }}
        >
          ?
        </span>
      </span>
      <span style={{ display: 'flex', width: 106, alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 1px 7px' }}>
        <span className="narrow" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--accent)' }}>
          TO FIND
        </span>
        <span className="slab" style={{ fontSize: 15, lineHeight: 1, color: 'rgba(26,20,16,0.34)' }}>{index + 1}</span>
      </span>
    </button>
  );
}

function Slot({
  index, player, given, focused, depth, revealed, revealDelay, images,
  onFocus, ring, tilt, landing, pinDriving, pinDelay, plateRef, interactive, showPin,
  column, columnRun, columnInstant,
}: {
  index: number;
  player: Player | undefined;
  given: boolean;
  focused: boolean;
  /** How deep this pick dug. Withheld from the card until `revealed`. */
  depth: SlotDepth | null;
  revealed: boolean;
  revealDelay: number;
  images: Record<string, PortraitImage>;
  onFocus: (i: number) => void;
  /** Ring colour for the mounted print. See PlayerCard. */
  ring: string;
  tilt: number;
  landing: boolean;
  pinDriving: boolean;
  pinDelay: number;
  plateRef: (el: HTMLDivElement | null) => void;
  interactive: boolean;
  showPin: boolean;
  /** The depth column under this print, once the chain is sealed. */
  column: ColumnSpec | null;
  columnRun: boolean;
  columnInstant: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}`, disabled: given || !interactive });

  return (
    <div style={{ width: 116, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <div ref={setNodeRef} style={{ position: 'relative' }}>
        {player ? (
          <div onClick={() => interactive && !given && onFocus(index)}>
            <PlayerCard
              player={player}
              variant={given ? 'given' : 'found'}
              slotId={interactive ? `slot:${index}` : undefined}
              images={images}
              // The column under the card says "worth 64"; printing 64 on
              // the nameplate as well is the same number twice.
              obscurity={revealed && depth && !column ? depth.score : null}
              revealDelay={revealed ? revealDelay : undefined}
              ring={ring}
              tilt={tilt}
              // The corner carries ONE number. While the sheet is open that is
              // the plate's position, which is how the brief and the search
              // rail refer to it; once it is sealed it is the pick's obscurity,
              // which is the only number that matters any more. Printing the
              // position on the givens and the score on the picks — as the
              // first pass did — reads as though LINEKER were in plate 3.
              index={revealed ? undefined : index + 1}
              pin={showPin ? 'red' : null}
              pinDriving={pinDriving}
              pinDelay={pinDelay}
              landing={landing}
              plateRef={plateRef}
            />
          </div>
        ) : (
          // No pin on an empty plate. A pin holds something up, and having
          // one already in the board turns the drop into a card sliding under
          // furniture that was there all along — where the whole point is
          // that dropping a card is what drives the pin.
          <div ref={plateRef} style={{ position: 'relative' }}>
            <EmptySlot index={index} focused={focused} isOver={isOver} tilt={tilt} onFocus={onFocus} />
          </div>
        )}
      </div>
      <span
        className="narrow"
        style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: given ? 'var(--muted)' : 'var(--accent)',
        }}
      >
        {given ? 'Given' : 'Yours'}
      </span>
      {revealed && column ? <DepthColumn spec={column} run={columnRun} instant={columnInstant} /> : null}
    </div>
  );
}

export default function ChainRow({
  fill, slots, links, mode, clubs, images, players, revealed, ringFor, depthFor,
  focused = null, onFocus = () => {}, interactive = true, landedIndex = null,
  pinsDriving = false, pinBeat = 0, plateRef, showPins = true, revealDelayFor, stringed = false,
  stampedThrough, columnFor, columnRunFor = () => true, columnInstant = false,
}: {
  /** Player ids in order, or null for a slot still empty. */
  fill: readonly (string | null)[];
  /** The puzzle's own slots: non-null means the board handed that one over. */
  slots: readonly (string | null)[];
  links: readonly ChainLink[];
  mode: 'chemistry' | 'clubs';
  clubs: Record<string, ClubView>;
  images: Record<string, PortraitImage>;
  players: ReadonlyMap<string, Player>;
  revealed: boolean;
  ringFor: (i: number) => string;
  depthFor: (i: number) => SlotDepth | null;
  focused?: number | null;
  onFocus?: (i: number) => void;
  /** False on the sealed sheet: nothing there is a drop target any more. */
  interactive?: boolean;
  /** The slot just filled, which plays the landing once. */
  landedIndex?: number | null;
  pinsDriving?: boolean;
  pinBeat?: number;
  /** Reports each mount's node, so the string knows where the pins are. */
  plateRef?: (i: number, el: HTMLDivElement | null) => void;
  showPins?: boolean;
  revealDelayFor?: (i: number) => number;
  /** A red string is being run between the pins, so the rules step aside. */
  stringed?: boolean;
  /**
   * Links up to and including this index carry their stamp; those after it
   * still look unrevealed. Undefined means no stamps — the live board's
   * connectors reveal in place.
   */
  stampedThrough?: number;
  /** The column under each blank, once sealed. Undefined means no columns. */
  columnFor?: (i: number) => ColumnSpec | null;
  /** Whether a column has been told to run yet; before that it waits in pencil. */
  columnRunFor?: (i: number) => boolean;
  /** Columns land on their rank at once. See DepthColumn. */
  columnInstant?: boolean;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  // The connectors flex, so the row always claims the width it is given —
  // which means it never reports an overflow, it just crushes the labels and
  // then pushes the end cards past the paper's edge. `scrollWidth` is the
  // honest number: what the row would need if nothing were squashed. Scaling
  // DOWN only, so a wide sheet is never blown up past its drawn size.
  useLayoutEffect(() => {
    const measure = () => {
      const box = outer.current;
      const row = inner.current;
      if (!box || !row) return;
      const need = row.scrollWidth;
      const have = box.clientWidth;
      if (need <= 0 || have <= 0) return;
      setFit(Math.max(0.55, Math.min(1, have / need)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [fill.length, revealed]);

  return (
    <div ref={outer} style={{ width: '100%' }}>
      <div
        ref={inner}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%',
          transform: fit < 1 ? `scale(${fit})` : undefined,
          transformOrigin: 'top center',
          // A scaled element keeps its unscaled footprint, which would leave
          // a band of empty paper under the row exactly as wide as the amount
          // it shrank. Take it back.
          marginBottom: fit < 1 ? `${-(1 - fit) * 210}px` : undefined,
        }}
      >
      {fill.map((id, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {i > 0 && links[i - 1] ? (
            <Connector
              link={links[i - 1]!}
              mode={mode}
              clubs={clubs}
              revealed={revealed}
              showRule={!stringed}
              stamped={stampedThrough === undefined ? null : i - 1 <= stampedThrough}
            />
          ) : null}
          <Slot
            index={i}
            player={id ? players.get(id) : undefined}
            given={slots[i] != null}
            focused={focused === i}
            depth={depthFor(i)}
            revealed={revealed}
            revealDelay={revealDelayFor?.(i) ?? 0}
            images={images}
            onFocus={onFocus}
            ring={ringFor(i)}
            tilt={tiltFor(`slot-${i}`)}
            landing={landedIndex === i}
            // Two ways a pin goes in: one at a time as the player drops a
            // card, and all of them in sequence when the sheet is sealed.
            pinDriving={pinsDriving || landedIndex === i}
            // A beat AFTER the card lands, never with it. A pin that arrives
            // on the same frame reads as part of the card rather than as
            // something done to it.
            pinDelay={pinsDriving ? i * pinBeat : 210}
            plateRef={(el) => plateRef?.(i, el)}
            interactive={interactive}
            showPin={showPins}
            column={columnFor?.(i) ?? null}
            columnRun={columnRunFor(i)}
            columnInstant={columnInstant}
          />
        </div>
      ))}
      </div>
    </div>
  );
}
