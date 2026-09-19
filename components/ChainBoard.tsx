'use client';
import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import Sticker, { EmptySticker } from './Sticker';
import ClubBadge, { shortClubName } from './ClubBadge';
import ClueBadge from './ClueBadge';
import type { ChainLink } from '../src/lib/chain/score';
import type { SlotClue } from '../src/lib/chain/types';
import type { ClubView } from '../src/lib/clubs';
import type { Named } from '../src/lib/chain/client';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * The chain, as stickers on a page.
 *
 * ONE component draws the live board and the sealed board. The reveal is the
 * same page with the answers on it, and two implementations would drift.
 *
 * A line lies left to right on a desk and stands top to bottom on a phone;
 * that switch is CSS, not React (see `.chain--line` in globals.css). A ring
 * is drawn round the edges of a grid on both.
 */

/**
 * The connector. Shows nothing until the chain is sealed: a board that lights
 * a link as it is satisfied has no bet on it. A named club is the exception,
 * shown from the first render, because it is the rule and not the answer.
 */
function Link({ link, mode, clubs, revealed, stamped, vertical }: {
  link: ChainLink;
  mode: 'chemistry' | 'clubs';
  clubs: Record<string, ClubView>;
  revealed: boolean;
  /** null: live board. false: sealed but not yet reached. true: judged. */
  stamped: boolean | null;
  vertical: boolean;
}) {
  const shown = revealed && stamped !== false;
  const held = shown && link.made;
  const named = link.required;
  const via = named ?? (shown && held && mode === 'clubs' ? link.clubs[0] : undefined);
  const state = shown ? (held ? 'link--held' : 'link--broken') : named ? 'link--named' : '';
  const dieState = shown ? (held ? 'die--held' : 'die--broken') : named ? 'die--named' : '';
  const pressed = stamped === true;

  return (
    <div className={`link ${vertical ? 'link--v' : 'link--h'} ${state}`}>
      <span className="link__rule" aria-hidden />
      <span className={`die ${dieState} ${pressed ? 'die--pressed' : ''}`} aria-hidden>
        {via ? (
          <ClubBadge clubId={via} club={clubs[via]} size={22} />
        ) : shown ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" />
          </svg>
        ) : null}
      </span>
      {via ? (
        <span className="link__club" title={clubs[via]?.name ?? via}>{shortClubName(clubs[via]?.name ?? via)}</span>
      ) : null}
    </div>
  );
}

function Slot({
  index, player, given, focused, image, ground, onFocus, interactive, landing, clue, clueMet,
}: {
  index: number;
  player: Named | undefined;
  given: boolean;
  focused: boolean;
  image: PortraitImage | undefined;
  ground: string;
  onFocus: (i: number) => void;
  interactive: boolean;
  landing: boolean;
  clue?: SlotClue;
  /** The verdict on the clue once sealed; null while the board is open. */
  clueMet: boolean | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}`, disabled: given || !interactive });
  const clueState = clueMet === null ? '' : clueMet ? 'clue--met' : 'clue--missed';
  const clueColour = clueMet === null ? 'var(--ink)' : clueMet ? 'var(--green)' : 'var(--red)';

  return (
    <div className="slot">
      <div ref={setNodeRef} className="slot__drop">
        {player ? (
          <div onClick={() => interactive && !given && onFocus(index)}>
            <Sticker
              player={player}
              image={image}
              ground={ground}
              index={index + 1}
              dragId={interactive && !given ? `slot:${index}:${player.id}` : undefined}
              fromSlot={`slot:${index}`}
              landing={landing}
            />
          </div>
        ) : (
          <EmptySticker index={index} focused={focused} over={isOver} onFocus={onFocus} />
        )}
      </div>
      {clue && !given ? (
        <span className={`clue ${clueState}`}>
          <ClueBadge clue={clue} colour={clueColour} />
          <span>{clueMet === false ? `not ${clue.label}` : clue.label}</span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * Where each slot of a ring sits, clockwise from slot 0, by ring length.
 * Eight is a square with the middle empty; six is a 3×2 loop, so every link
 * runs along a row or down a column.
 */
const RINGS: Readonly<Record<number, readonly [row: number, col: number][]>> = {
  8: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0]],
  6: [[0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [0, 0]],
};

export default function ChainBoard({
  fill, slots, links, mode, clubs, images, players, revealed, groundFor,
  focused = null, onFocus = () => {}, interactive = true, landedIndex = null,
  stampedThrough, closed = false, clues = {}, clueMetFor = () => null, below,
}: {
  fill: readonly (string | null)[];
  slots: readonly (string | null)[];
  links: readonly ChainLink[];
  mode: 'chemistry' | 'clubs';
  clubs: Record<string, ClubView>;
  images: Record<string, PortraitImage>;
  players: ReadonlyMap<string, Named>;
  revealed: boolean;
  /** The ground behind each sticker's photo. */
  groundFor: (i: number) => string;
  focused?: number | null;
  onFocus?: (i: number) => void;
  interactive?: boolean;
  landedIndex?: number | null;
  /** Links up to this index carry their verdict; later ones look unsealed. */
  stampedThrough?: number;
  closed?: boolean;
  clues?: Readonly<Record<number, SlotClue>>;
  clueMetFor?: (i: number) => boolean | null;
  /** Anything to hang under a slot once sealed (the depth column). */
  below?: (i: number) => ReactNode;
}) {
  const link = (li: number, vertical: boolean) => links[li] ? (
    <Link
      link={links[li]!}
      mode={mode}
      clubs={clubs}
      revealed={revealed}
      stamped={stampedThrough === undefined ? null : li <= stampedThrough}
      vertical={vertical}
    />
  ) : null;

  const slot = (i: number) => (
    <Slot
      index={i}
      player={fill[i] ? players.get(fill[i]!) : undefined}
      given={slots[i] != null}
      focused={focused === i}
      image={fill[i] ? images[fill[i]!] : undefined}
      ground={groundFor(i)}
      onFocus={onFocus}
      interactive={interactive}
      landing={landedIndex === i}
      clue={clues[i]}
      clueMet={clueMetFor(i)}
    />
  );

  if (closed && RINGS[fill.length]) {
    const layout = RINGS[fill.length]!;
    const rows = Math.max(...layout.map(([r]) => r)) + 1;
    const cells: ReactNode[] = [];
    fill.forEach((_, i) => {
      const [r, c] = layout[i]!;
      cells.push(
        <div key={`s${i}`} style={{ gridRow: 2 * r + 1, gridColumn: 2 * c + 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {slot(i)}
          {below?.(i)}
        </div>,
      );
      const [r2, c2] = layout[(i + 1) % layout.length]!;
      const vertical = c === c2;
      cells.push(
        <div
          key={`l${i}`}
          style={vertical
            ? { gridRow: 2 * Math.min(r, r2) + 2, gridColumn: 2 * c + 1, display: 'flex', justifyContent: 'center' }
            : { gridRow: 2 * r + 1, gridColumn: 2 * Math.min(c, c2) + 2, display: 'flex', justifyContent: 'center' }}
        >
          {link(i, vertical)}
        </div>,
      );
    });
    return (
      <div
        className="chain chain--ring"
        style={{ gridTemplateRows: Array.from({ length: rows }, (_, r) => (r === 0 ? 'auto' : 'var(--link-h) auto')).join(' ') }}
      >
        {cells}
      </div>
    );
  }

  return (
    <div className="chain chain--line">
      {fill.map((_, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {i > 0 ? (
            <>
              {link(i - 1, false)}
              {link(i - 1, true)}
            </>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {slot(i)}
            {below?.(i)}
          </div>
        </div>
      ))}
    </div>
  );
}
