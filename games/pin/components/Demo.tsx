import { Ball, Lines, PinMark, Rings } from './Pitch';

/**
 * How to play's demo, in three frames (HowItWorks): the goal is named; a
 * pin drops and is dragged into place; Throw is pressed and the ball and
 * rings show where it was struck. An unnamed goal at a made-up spot, so it
 * spoils no pack. Each frame rests on its last moment, so reduced motion
 * shows it still.
 */
const PIN = { x: 25, y: 19.3 };
const AT = { x: 22.5, y: 21 };

export default function Demo({ step }: { step: number }) {
  return (
    <div className="pin-demo" data-step={step}>
      <div className="pin-demo__card" aria-hidden>
        <span className="pin-demo__bar" style={{ width: '38%' }} />
        <span className="pin-demo__bar pin-demo__bar--name" style={{ width: '64%' }} />
        <span className="pin-demo__bar" style={{ width: '52%' }} />
      </div>
      <div className="pitch">
        <svg
          className="pitch__svg"
          viewBox="-1.5 -3 71 57"
        >
          <rect className="pitch__grass" x={-1.5} y={-3} width={71} height={57} />
          <Lines />
          <Rings at={AT} className="pin-demo__rings" />
          <line className="pitch__trail pin-demo__trail" x1={PIN.x} y1={PIN.y} x2={AT.x} y2={AT.y} />
          <circle className="pin-demo__ripple" cx={PIN.x + 3} cy={PIN.y + 2.2} r={1} />
          <g className="pin-demo__ball"><Ball at={AT} still /></g>
          <g className="pin-demo__pin"><PinMark at={PIN} /></g>
        </svg>
      </div>
      <div className="pin-demo__foot" aria-hidden>
        <div className="pin-demo__ask">
          <span>Tap the pitch, drag to adjust</span>
          <span className="pin-demo__throw display">Throw</span>
        </div>
        <div className="pin-demo__res">
          <span className="display pin-demo__m">3.0 m</span>
          <span className="pin-demo__pts">
            <span className="display">+88</span>
            <span className="pin__ring pin__ring--inner display">Inner</span>
          </span>
        </div>
      </div>
    </div>
  );
}
