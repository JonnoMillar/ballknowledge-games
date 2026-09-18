'use client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import PlayerCard from './PlayerCard';
import ClubBadge, { shortClubName } from './ClubBadge';
import { tiltFor } from './swing';
import Stamp from './Stamp';
import DepthColumn, { type ColumnSpec } from './DepthColumn';
import ClueBadge from './ClueBadge';
import type { ChainLink } from '../src/lib/chain/score';
import type { SlotClue } from '../src/lib/chain/types';
import type { SlotDepth } from '../src/lib/chain/score';
import type { ClubView } from '../src/lib/clubs';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

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
function Connector({ link, mode, clubs, revealed, stamped, vertical = false, flow = null, locked = false }: {
  link: ChainLink;
  mode: 'chemistry' | 'clubs';
  clubs: Record<string, ClubView>;
  revealed: boolean;
  /**
   * The verdict on this link, as one of three states. `null` is the live
   * board: the connector reveals in place. On the sealed sheet the die comes
   * down one link at a time — `false` is a link the string has not reached
   * yet, which looks exactly as it did before lock-in, and `true` is the
   * stamp on it.
   */
  stamped: boolean | null;
  /**
   * Standing up, between a card above and a card below. The ring's sides.
   * Same rule, same crest, same label — the rule is split around the crest
   * so the crest sits at the link's midpoint rather than at one end of it.
   */
  vertical?: boolean;
  /**
   * The current: a bead of light runs this link, `delay` ms from now, in
   * `ms`, from slot i to slot i+1 — which on a ring may be leftward or
   * upward, hence `reverse`. Null until every link has held.
   */
  flow?: { delay: number; ms: number; reverse: boolean } | null;
  /** The chain has locked: the rule goes solid and glows, the die pulses. */
  locked?: boolean;
}) {
  // A link the stamp has not reached yet must give nothing away: the sheet
  // is sealed, but the player has not been TOLD yet.
  const shown = revealed && stamped !== false;
  const made = shown && link.made;
  const named = link.required;
  const via = named ?? (shown && made && mode === 'clubs' ? link.clubs[0] : undefined);

  // The rule is the same dotted line before and after the verdict; only
  // its colour changes, to the colour of the die that came down on it. It
  // goes solid once — when the whole chain locks.
  const rule = made
    ? locked ? '2.5px solid var(--green)' : '2.5px dotted var(--green)'
    : shown
      ? '2px dashed var(--accent)'
      : named
        ? '2.5px solid var(--accent)'
        : '2px dotted rgba(26,20,16,0.42)';
  const lock = locked && made ? { animation: 'link-lock 700ms ease-out both' } : {};

  // The same rule, drawn along the other axis: `border-top` becomes
  // `border-left`, and the width becomes a height that fills the gap.
  const post = <div style={{ flexGrow: 1, width: 0, minHeight: 10, borderLeft: rule, transition: 'border-color 260ms ease', ...lock }} />;

  // The bead. It rides the rule's own line — 46px down on a lying link,
  // the centre on a standing one — and passes UNDER the die, which sits
  // above it in the stack, so the charge reads as going through the seal.
  const bead = flow ? (
    <span
      aria-hidden
      style={{
        position: 'absolute', zIndex: 2, pointerEvents: 'none',
        ...(vertical
          ? { left: '50%', width: 7, height: 52, borderRadius: 4, background: `linear-gradient(${flow.reverse ? 0 : 180}deg, rgba(122,214,150,0), #baf0cb 55%, #ffffff 82%, #baf0cb)` }
          : { top: 47, width: 52, height: 7, borderRadius: 4, background: `linear-gradient(${flow.reverse ? 270 : 90}deg, rgba(122,214,150,0), #baf0cb 55%, #ffffff 82%, #baf0cb)` }),
        boxShadow: '0 0 14px 5px rgba(95,208,138,0.85), 0 0 3px 1px rgba(255,255,255,0.9)',
        animation: `${vertical ? 'flow-y' : 'flow-x'} ${flow.ms}ms linear ${flow.delay}ms both`,
        animationDirection: flow.reverse ? 'reverse' : 'normal',
      }}
    />
  ) : null;

  return (
    <div
      style={vertical ? {
        position: 'relative', height: '100%', minHeight: 88, width: 116,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      } : {
        position: 'relative', flexGrow: 1, flexBasis: 74, minWidth: 44,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        paddingTop: 46, alignSelf: 'flex-start',
      }}
    >
      {bead}
      {vertical
        ? post
        : <div style={{ width: '100%', height: 0, borderTop: rule, transition: 'border-color 260ms ease', ...lock }} />}
      {stamped ? (
        // The die, centred where the crest would have been. It overflows the
        // crest's box on purpose: nothing below it moves when it lands.
        <div style={{ position: 'relative', width: 28, height: 28 }}>
          <Stamp held={link.made} clubId={via} club={via ? clubs[via] : undefined} lean={tiltFor(`stamp-${link.clubs.join('-')}-${String(named)}`, 8)} locked={locked && made} />
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
      {vertical ? post : null}
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
  column, columnRun, columnInstant, clue, clueMet, chargeAt = null, locked = false,
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
  /** The clue printed on this plate, if the board gave it one. */
  clue?: SlotClue;
  /** The verdict on the clue once revealed; null while the sheet is open. */
  clueMet: boolean | null;
  /** When the current reaches this card, in ms from now. Null: no current. */
  chargeAt?: number | null;
  /** The chain has locked: the card takes one green pulse. */
  locked?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}`, disabled: given || !interactive });
  // The card lights as the charge arrives, then glows once the chain locks.
  // On the card's wrapper rather than the card, so the pin and the ring
  // come with it. Above the connectors, so the bead passes behind it.
  const charge = locked
    ? { animation: 'card-lock 700ms ease-out both' }
    : chargeAt !== null
      ? { animation: `card-charge 420ms ease-out ${chargeAt}ms both` }
      : {};

  // The caption under the plate. "Yours" on a plain blank; on a clued one it
  // is the clue itself, because the clue is what the plate says. Once the
  // sheet is sealed it becomes the verdict on the clue — met in green, or
  // "not a goalkeeper" in red — so a pick that linked both ends and still
  // failed can see why.
  const caption = given
    ? 'Given'
    : clue
      ? (clueMet === null ? clue.label : clueMet ? clue.label : `not ${clue.label}`)
      : 'Yours';
  const captionColour = given
    ? 'var(--muted)'
    : clue && clueMet !== null
      ? (clueMet ? 'var(--green)' : 'var(--accent)')
      : 'var(--accent)';

  return (
    <div style={{ width: 116, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <div ref={setNodeRef} style={{ position: 'relative', zIndex: 2, ...charge }}>
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
      {clue && !given ? (
        // The clue is a thing on the plate — a flag, a roundel — with the
        // words beside it. See ClueBadge.
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, maxWidth: 116 }}>
          <ClueBadge clue={clue} colour={captionColour} />
          <span
            className="narrow"
            style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: captionColour, lineHeight: 1.15, textAlign: 'left',
            }}
          >
            {caption}
          </span>
        </span>
      ) : (
        <span
          className="narrow"
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: captionColour, textAlign: 'center', lineHeight: 1.2, maxWidth: 116,
          }}
        >
          {caption}
        </span>
      )}
      {revealed && column ? <DepthColumn spec={column} run={columnRun} instant={columnInstant} /> : null}
    </div>
  );
}

export default function ChainRow({
  fill, slots, links, mode, clubs, images, players, revealed, ringFor, depthFor,
  focused = null, onFocus = () => {}, interactive = true, landedIndex = null,
  pinsDriving = false, pinBeat = 0, plateRef, showPins = true, revealDelayFor,
  stampedThrough, columnFor, columnRunFor = () => true, columnInstant = false, closed = false,
  clues = {}, clueMetFor = () => null, current = null, locked = false,
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
  /**
   * The current runs the chain: link 0 at `delay` ms from now, each link
   * taking `ms`, each card lighting as it is reached. Null: no current.
   */
  current?: { delay: number; ms: number } | null;
  /** The chain has locked: rules solid, dies and cards pulsing, once. */
  locked?: boolean;
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
  /**
   * A ring: link `n-1` joins the last slot to the first, and the chain is
   * drawn round the edges of a square rather than along a line. See
   * `ChainPuzzle.closed`.
   */
  closed?: boolean;
  /** The clue on each blank, keyed by slot. See `ChainPuzzle.clues`. */
  clues?: Readonly<Record<number, SlotClue>>;
  /** The verdict on a slot's clue once sealed; null while the sheet is open. */
  clueMetFor?: (i: number) => boolean | null;
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

  const connector = (li: number, vertical = false, reverse = false) => links[li] ? (
    <Connector
      link={links[li]!}
      mode={mode}
      clubs={clubs}
      revealed={revealed}
      stamped={stampedThrough === undefined ? null : li <= stampedThrough}
      vertical={vertical}
      flow={current ? { delay: current.delay + li * current.ms, ms: current.ms, reverse } : null}
      locked={locked}
    />
  ) : null;

  const slot = (i: number, column: ColumnSpec | null) => (
    <Slot
      index={i}
      player={fill[i] ? players.get(fill[i]!) : undefined}
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
      column={column}
      columnRun={columnRunFor(i)}
      columnInstant={columnInstant}
      clue={clues[i]}
      clueMet={clueMetFor(i)}
      // The charge reaches slot i as link i-1 finishes; on a ring slot 0 is
      // reached again as the last link finishes, which is the moment the
      // loop closes.
      chargeAt={current ? current.delay + (i === 0 ? (closed ? fill.length : 0) : i) * current.ms : null}
      locked={locked}
    />
  );

  if (closed && RINGS[fill.length]) {
    return (
      <Ring
        fill={fill}
        players={players}
        slots={slots}
        slot={slot}
        connector={connector}
        revealed={revealed}
        columnFor={columnFor}
        columnRunFor={columnRunFor}
        columnInstant={columnInstant}
      />
    );
  }

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
      {fill.map((_, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {i > 0 ? connector(i - 1) : null}
          {slot(i, columnFor?.(i) ?? null)}
        </div>
      ))}
      </div>
    </div>
  );
}

/**
 * Where each slot of a ring sits on a grid of cards, clockwise from slot 0,
 * by ring length.
 *
 * Eight is a square: 3×3 of cards with the middle empty, slot 0 top-left.
 * With givens in the corners the blanks fall on the edges — the only
 * arrangement that gives every blank two givens to link to.
 *
 * Six is a triangle in everything but the drawing: three givens, three
 * blanks, each blank between two givens. It is drawn as a 3×2 loop — the
 * top corner in the middle of the top row, the other two at the ends of the
 * bottom — because every link then runs along a row or down a column, and
 * the connectors and the string already know how to do both. A true
 * triangle needs diagonals, which neither does yet.
 */
const RINGS: Readonly<Record<number, readonly [row: number, col: number][]>> = {
  8: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0]],
  6: [[0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [0, 0]],
};

/**
 * The chain drawn round a square.
 *
 * Cards on the odd tracks of a five-by-five grid, connectors on the even
 * ones between them; the sides stand up. The columns cannot hang under the
 * edge cards — the top one would run into the middle and the sides into the
 * bottom corners — so once the sheet is sealed they line up in a row below
 * the square, in slot order, each labelled with the plate it reads for.
 */
function Ring({
  fill, players, slots, slot, connector, revealed, columnFor, columnRunFor, columnInstant,
}: {
  fill: readonly (string | null)[];
  players: ReadonlyMap<string, Player>;
  slots: readonly (string | null)[];
  slot: (i: number, column: ColumnSpec | null) => ReactNode;
  connector: (li: number, vertical?: boolean, reverse?: boolean) => ReactNode;
  revealed: boolean;
  columnFor?: (i: number) => ColumnSpec | null;
  columnRunFor: (i: number) => boolean;
  columnInstant: boolean;
}) {
  const layout = RINGS[fill.length]!;
  const rows = Math.max(...layout.map(([r]) => r)) + 1;
  const cells: ReactNode[] = [];
  fill.forEach((_, i) => {
    const [r, c] = layout[i]!;
    cells.push(
      <div key={`s${i}`} style={{ gridRow: 2 * r + 1, gridColumn: 2 * c + 1, display: 'flex', justifyContent: 'center' }}>
        {slot(i, null)}
      </div>,
    );
    // Link i joins slot i and slot i+1 (round the ring). It sits on the
    // track between them, standing when they are one above the other.
    const [r2, c2] = layout[(i + 1) % layout.length]!;
    const vertical = c === c2;
    // The current runs slot i → slot i+1, which round a ring is leftward
    // along the bottom and upward on the left side.
    const reverse = vertical ? r2 < r : c2 < c;
    cells.push(
      <div
        key={`l${i}`}
        style={vertical
          ? { gridRow: 2 * Math.min(r, r2) + 2, gridColumn: 2 * c + 1, display: 'flex', justifyContent: 'center' }
          : { gridRow: 2 * r + 1, gridColumn: 2 * Math.min(c, c2) + 2, display: 'flex' }}
      >
        {connector(i, vertical, reverse)}
      </div>,
    );
  });

  const blanks = fill.map((_, i) => i).filter((i) => slots[i] == null);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '116px minmax(74px, 150px) 116px minmax(74px, 150px) 116px',
          gridTemplateRows: Array.from({ length: rows }, (_, r) => (r === 0 ? 'auto' : '92px auto')).join(' '),
          width: '100%', maxWidth: 760, justifyContent: 'center',
        }}
      >
        {cells}
      </div>
      {revealed && columnFor ? (
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', width: '100%', borderTop: '1.5px dashed rgba(26,20,16,0.3)', paddingTop: 10 }}>
          {blanks.map((i) => {
            const column = columnFor(i);
            const pick = fill[i] ? players.get(fill[i]!) : undefined;
            return column ? (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* The column is a reading of one pick, so it is headed by
                    that pick's name, the way the nameplate on the card
                    prints it. "Plate 4" alone sent the eye back up to the
                    square to count. */}
                <div className="narrow" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--accent)', lineHeight: 1.1 }}>
                  {pick ? plateName(pick.id, pick.name).toUpperCase() : '—'}
                </div>
                <div className="narrow" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Plate {i + 1}
                </div>
                <DepthColumn spec={column} run={columnRunFor(i)} instant={columnInstant} />
              </div>
            ) : null;
          })}
        </div>
      ) : null}
    </div>
  );
}
