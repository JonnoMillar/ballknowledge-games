'use client';
import Pin from './Pin';

/**
 * The two pins that hold the sheet to the board.
 *
 * This is what the bulldog clip was replaced by, and the reason is not
 * taste. The surface behind the sheet is a pinboard: pins go into it, string
 * runs across it, prints hang on it. A clip holds paper to a clipboard, and a
 * clipboard is a thing you carry — put one on a wall and the whole page is
 * two objects that do not know about each other. Pinned at the corners, the
 * sheet is on the board the same way everything else on it is.
 *
 * Gold, not red. Red is the string's colour, and a red pin is one the string
 * is tied to.
 */
export default function SheetPins() {
  const pins: Array<{ left?: number; right?: number; lean: number }> = [
    { left: 26, lean: -6 },
    { right: 26, lean: 5 },
  ];
  return (
    <>
      {pins.map((p, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute', top: 9, left: p.left, right: p.right,
            width: 0, height: 0, zIndex: 6,
            transform: `rotate(${p.lean}deg)`,
          }}
        >
          <Pin size={21} colour="#a8791f" />
        </span>
      ))}
    </>
  );
}
