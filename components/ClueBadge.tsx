'use client';
import type { ReactNode } from 'react';
import type { SlotClue } from '../src/lib/chain/types';

/**
 * The clue on a plate, as a thing rather than a caption.
 *
 * "AN ARGENTINE" in nine-point type under a card is a footnote; a flag is a
 * rule. The nationality draws as its flag and the position as a roundel
 * with GK / DEF / MID / FWD in it, both the size of the club crest on a
 * link, so the three kinds of clue a plate can carry read as the same kind
 * of thing.
 *
 * The flags are drawn here, not fetched: a dozen tricolours and crosses
 * are a few lines each, they never fail to load, and the board owes
 * nothing to a third party for them. A nation with no drawing falls back
 * to its label's initials in the roundel, so a new clue never renders as
 * a blank.
 */

const W = 30;
const H = 20;

const horizontal = (colours: string[], weights?: number[]) => {
  const w = weights ?? colours.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let y = 0;
  return colours.map((c, i) => {
    const h = (H * w[i]!) / total;
    const el = <rect key={i} x={0} y={y} width={W} height={h} fill={c} />;
    y += h;
    return el;
  });
};

const vertical = (colours: string[], weights?: number[]) => {
  const w = weights ?? colours.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let x = 0;
  return colours.map((c, i) => {
    const width = (W * w[i]!) / total;
    const el = <rect key={i} x={x} y={0} width={width} height={H} fill={c} />;
    x += width;
    return el;
  });
};

/** A Nordic cross: the upright sits a third of the way across. */
const cross = (ground: string, ink: string, upright = 11, arm = 4) => (
  <>
    <rect width={W} height={H} fill={ground} />
    <rect x={upright} y={0} width={arm} height={H} fill={ink} />
    <rect x={0} y={(H - arm) / 2} width={W} height={arm} fill={ink} />
  </>
);

/** Nation QID → drawing, for the nations a clue is likely to name. */
const FLAGS: Readonly<Record<string, () => ReactNode>> = {
  Q21: () => cross('#ffffff', '#cf142b', 13, 4),                    // England
  Q22: () => (                                                      // Scotland
    <>
      <rect width={W} height={H} fill="#0065bd" />
      <path d={`M0 0 L${W} ${H} M${W} 0 L0 ${H}`} stroke="#ffffff" strokeWidth={3.4} />
    </>
  ),
  Q25: () => (                                                      // Wales
    <>
      {horizontal(['#ffffff', '#00b140'])}
      <path d="M11 6 q3 -3 6 0 q2 3 0 6 q-2 3 -5 1 q3 -1 2 -3 q-3 1 -3 -2 z" fill="#d30731" />
    </>
  ),
  Q27: () => vertical(['#169b62', '#ffffff', '#ff883e']),           // Ireland
  Q142: () => vertical(['#0055a4', '#ffffff', '#ef4135']),          // France
  Q183: () => horizontal(['#000000', '#dd0000', '#ffce00']),        // Germany
  Q29: () => horizontal(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]), // Spain
  Q38: () => vertical(['#009246', '#ffffff', '#ce2b37']),           // Italy
  Q31: () => vertical(['#000000', '#fdda24', '#ef3340']),           // Belgium
  Q55: () => horizontal(['#ae1c28', '#ffffff', '#21468b']),         // Netherlands
  Q45: () => (                                                      // Portugal
    <>
      {vertical(['#006600', '#ff0000'], [2, 3])}
      <circle cx={12} cy={10} r={4.2} fill="#ffe000" />
      <circle cx={12} cy={10} r={2.2} fill="#ff0000" />
    </>
  ),
  Q224: () => (                                                     // Croatia
    <>
      {horizontal(['#ff0000', '#ffffff', '#171796'])}
      {[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => (
        <rect key={`${r}${c}`} x={11 + c * 2} y={6 + r * 2} width={2} height={2} fill={(r + c) % 2 === 0 ? '#ff0000' : '#ffffff'} />
      )))}
    </>
  ),
  Q155: () => (                                                     // Brazil
    <>
      <rect width={W} height={H} fill="#009c3b" />
      <path d={`M15 2 L27 10 L15 18 L3 10 Z`} fill="#ffdf00" />
      <circle cx={15} cy={10} r={4.6} fill="#002776" />
    </>
  ),
  Q414: () => (                                                     // Argentina
    <>
      {horizontal(['#74acdf', '#ffffff', '#74acdf'])}
      <circle cx={15} cy={10} r={2.6} fill="#f6b40e" />
    </>
  ),
  Q77: () => (                                                      // Uruguay
    <>
      {horizontal(['#ffffff', '#0038a8', '#ffffff', '#0038a8', '#ffffff', '#0038a8', '#ffffff', '#0038a8', '#ffffff'])}
      <rect x={0} y={0} width={13} height={11} fill="#ffffff" />
      <circle cx={6.5} cy={5.5} r={3} fill="#fcd116" />
    </>
  ),
  Q298: () => (                                                     // Chile
    <>
      {horizontal(['#ffffff', '#d52b1e'])}
      <rect x={0} y={0} width={10} height={10} fill="#0039a6" />
      <circle cx={5} cy={5} r={2} fill="#ffffff" />
    </>
  ),
  Q739: () => horizontal(['#fcd116', '#003893', '#ce1126'], [2, 1, 1]), // Colombia
  Q96: () => vertical(['#006847', '#ffffff', '#ce1126']),           // Mexico
  Q30: () => (                                                      // United States
    <>
      {horizontal(['#b22234', '#ffffff', '#b22234', '#ffffff', '#b22234', '#ffffff', '#b22234'])}
      <rect x={0} y={0} width={13} height={11} fill="#3c3b6e" />
    </>
  ),
  Q36: () => horizontal(['#ffffff', '#dc143c']),                    // Poland
  Q34: () => cross('#006aa7', '#fecc00'),                           // Sweden
  Q35: () => cross('#c60c30', '#ffffff'),                           // Denmark
  Q20: () => (                                                      // Norway
    <>
      {cross('#ba0c2f', '#ffffff', 10, 6)}
      {cross('transparent', '#00205b', 11.5, 3)}
    </>
  ),
  Q33: () => cross('#ffffff', '#002f6c'),                           // Finland
  Q189: () => (                                                     // Iceland
    <>
      {cross('#02529c', '#ffffff', 10, 6)}
      {cross('transparent', '#dc1e35', 11.5, 3)}
    </>
  ),
  Q39: () => (                                                      // Switzerland
    <>
      <rect width={W} height={H} fill="#d52b1e" />
      <rect x={13} y={4} width={4} height={12} fill="#ffffff" />
      <rect x={9} y={8} width={12} height={4} fill="#ffffff" />
    </>
  ),
  Q40: () => horizontal(['#ed2939', '#ffffff', '#ed2939']),         // Austria
  Q213: () => (                                                     // Czech Republic
    <>
      {horizontal(['#ffffff', '#d7141a'])}
      <path d={`M0 0 L14 10 L0 ${H} Z`} fill="#11457e" />
    </>
  ),
  Q214: () => horizontal(['#ffffff', '#0b4ea2', '#ee1c25']),        // Slovakia
  Q28: () => horizontal(['#ce2939', '#ffffff', '#477050']),         // Hungary
  Q218: () => vertical(['#002b7f', '#fcd116', '#ce1126']),          // Romania
  Q219: () => horizontal(['#ffffff', '#00966e', '#d62612']),        // Bulgaria
  Q403: () => horizontal(['#c6363c', '#0c4076', '#ffffff']),        // Serbia
  Q225: () => (                                                     // Bosnia and Herzegovina
    <>
      <rect width={W} height={H} fill="#002395" />
      <path d={`M9 0 L27 0 L27 ${H} Z`} fill="#fecb00" />
    </>
  ),
  Q215: () => horizontal(['#ffffff', '#005da4', '#ed1c24']),        // Slovenia
  Q236: () => (                                                     // Montenegro
    <>
      <rect width={W} height={H} fill="#c40308" />
      <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="#d4af3a" strokeWidth={1.5} />
    </>
  ),
  Q221: () => (                                                     // North Macedonia
    <>
      <rect width={W} height={H} fill="#d20000" />
      <circle cx={15} cy={10} r={3.5} fill="#ffe600" />
      <path d={`M15 10 L0 0 M15 10 L30 0 M15 10 L0 20 M15 10 L30 20 M15 10 L15 0 M15 10 L15 20 M15 10 L0 10 M15 10 L30 10`} stroke="#ffe600" strokeWidth={2} />
    </>
  ),
  Q222: () => <rect width={W} height={H} fill="#e41e20" />,         // Albania
  Q1246: () => <rect width={W} height={H} fill="#244aa5" />,        // Kosovo
  Q41: () => (                                                      // Greece
    <>
      {horizontal(['#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf'])}
      <rect x={0} y={0} width={11} height={11} fill="#0d5eaf" />
      <rect x={4.5} y={0} width={2} height={11} fill="#ffffff" />
      <rect x={0} y={4.5} width={11} height={2} fill="#ffffff" />
    </>
  ),
  Q43: () => (                                                      // Turkey
    <>
      <rect width={W} height={H} fill="#e30a17" />
      <circle cx={11} cy={10} r={5} fill="#ffffff" />
      <circle cx={12.4} cy={10} r={4} fill="#e30a17" />
      <circle cx={17.5} cy={10} r={1.7} fill="#ffffff" />
    </>
  ),
  Q159: () => horizontal(['#ffffff', '#0039a6', '#d52b1e']),        // Russia
  Q212: () => horizontal(['#0057b7', '#ffd700']),                   // Ukraine
  Q17: () => (                                                      // Japan
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <circle cx={15} cy={10} r={5.5} fill="#bc002d" />
    </>
  ),
  Q884: () => (                                                     // South Korea
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <circle cx={15} cy={10} r={5} fill="#cd2e3a" />
      <path d="M10 10 a5 5 0 0 0 10 0 a2.5 2.5 0 0 0 -5 0 a2.5 2.5 0 0 1 -5 0" fill="#0047a0" />
    </>
  ),
  Q408: () => (                                                     // Australia
    <>
      <rect width={W} height={H} fill="#00008b" />
      <rect x={0} y={0} width={13} height={10} fill="#00008b" />
      <path d="M0 0 L13 10 M13 0 L0 10" stroke="#ffffff" strokeWidth={2} />
      <rect x={5.5} y={0} width={2} height={10} fill="#ffffff" />
      <rect x={0} y={4} width={13} height={2} fill="#ffffff" />
      <circle cx={21} cy={13} r={1.4} fill="#ffffff" />
    </>
  ),
  Q1008: () => vertical(['#f77f00', '#ffffff', '#009e60']),         // Ivory Coast
  Q1009: () => (                                                    // Cameroon
    <>
      {vertical(['#007a5e', '#ce1126', '#fcd116'])}
      <circle cx={15} cy={10} r={2} fill="#fcd116" />
    </>
  ),
  Q1033: () => vertical(['#008751', '#ffffff', '#008751']),         // Nigeria
  Q117: () => (                                                     // Ghana
    <>
      {horizontal(['#ce1126', '#fcd116', '#006b3f'])}
      <circle cx={15} cy={10} r={2.2} fill="#000000" />
    </>
  ),
  Q1041: () => (                                                    // Senegal
    <>
      {vertical(['#00853f', '#fdef42', '#e31b23'])}
      <circle cx={15} cy={10} r={2.2} fill="#00853f" />
    </>
  ),
  Q79: () => horizontal(['#ce1126', '#ffffff', '#000000']),         // Egypt
  Q1028: () => (                                                    // Morocco
    <>
      <rect width={W} height={H} fill="#c1272d" />
      <circle cx={15} cy={10} r={3.5} fill="none" stroke="#006233" strokeWidth={1.4} />
    </>
  ),
  Q262: () => (                                                     // Algeria
    <>
      {vertical(['#006233', '#ffffff'])}
      <circle cx={15} cy={10} r={4} fill="#d21034" />
      <circle cx={16.4} cy={10} r={3.2} fill="#ffffff" />
    </>
  ),
  Q1000: () => horizontal(['#009e60', '#fcd116', '#3a75c4']),       // Gabon
  Q912: () => vertical(['#14b53a', '#fcd116', '#ce1126']),          // Mali
  Q1006: () => vertical(['#ce1126', '#fcd116', '#009460']),         // Guinea
  Q16: () => (                                                      // Canada
    <>
      {vertical(['#ff0000', '#ffffff', '#ff0000'], [1, 2, 1])}
      <path d="M15 4 l2 3 l2 -1 l-1 4 l3 1 l-3 2 l1 3 l-4 -1 l0 3 l0 -3 l-4 1 l1 -3 l-3 -2 l3 -1 l-1 -4 l2 1 z" fill="#ff0000" />
    </>
  ),
  Q419: () => vertical(['#d91023', '#ffffff', '#d91023']),          // Peru
  Q733: () => horizontal(['#d52b1e', '#ffffff', '#0038a8']),        // Paraguay
  Q736: () => horizontal(['#ffdd00', '#034ea2', '#ed1c24'], [2, 1, 1]), // Ecuador
  Q717: () => horizontal(['#ffcc00', '#00247d', '#cf142b']),        // Venezuela
  Q800: () => horizontal(['#002b7f', '#ffffff', '#ce1126', '#ffffff', '#002b7f'], [1, 1, 2, 1, 1]), // Costa Rica
  Q230: () => (                                                     // Georgia
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <rect x={13} y={0} width={4} height={H} fill="#e8112d" />
      <rect x={0} y={8} width={W} height={4} fill="#e8112d" />
      {[[7, 4], [23, 4], [7, 16], [23, 16]].map(([x, y]) => (
        <g key={`${x}${y}`} fill="#e8112d">
          <rect x={x! - 0.7} y={y! - 2} width={1.4} height={4} />
          <rect x={x! - 2} y={y! - 0.7} width={4} height={1.4} />
        </g>
      ))}
    </>
  ),
  Q26: () => (                                                      // Northern Ireland (the Ulster banner)
    <>
      {cross('#ffffff', '#cf142b', 13, 4)}
      <circle cx={15} cy={10} r={3.6} fill="#ffffff" />
      <circle cx={15} cy={10} r={1.8} fill="#cf142b" />
    </>
  ),
  Q36704: () => horizontal(['#0c4076', '#ffffff', '#c6363c']),      // Yugoslavia
  Q766: () => (                                                     // Jamaica
    <>
      <rect width={W} height={H} fill="#009b3a" />
      <path d={`M0 0 L${W} ${H} M${W} 0 L0 ${H}`} stroke="#fed100" strokeWidth={4} />
      <path d={`M0 0 L15 10 L0 ${H} Z M${W} 0 L15 10 L${W} ${H} Z`} fill="#000000" />
    </>
  ),
};

/** The plate's roundel: the crest-sized ring the position and fallbacks sit in. */
function Roundel({ text, colour }: { text: string; colour: string }) {
  return (
    <span
      aria-hidden
      className="narrow"
      style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${colour}`, color: colour, background: 'var(--card-a)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: text.length > 2 ? 8.5 : 10, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1,
        boxShadow: '0 1px 2px rgba(26,20,16,0.18)',
      }}
    >
      {text}
    </span>
  );
}

const initials = (label: string) =>
  label.replace(/^(an?|the)\s+/i, '').split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 3).toUpperCase();

export const hasFlag = (qid: string) => qid in FLAGS;

/** A nation's flag by QID, unframed at `width` (it is 3:2); null when there is no drawing for it. */
export function Flag({ qid, width = W }: { qid: string; width?: number }) {
  const draw = FLAGS[qid];
  if (!draw) return null;
  return (
    <svg aria-hidden width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', flexShrink: 0 }}>
      {draw()}
    </svg>
  );
}

export default function ClueBadge({ clue, colour }: {
  clue: SlotClue;
  /** The ring's colour: the plate's accent, or the verdict's green or red. */
  colour: string;
}) {
  if (clue.kind === 'position') return <Roundel text={clue.value} colour={colour} />;
  const draw = FLAGS[clue.value];
  if (!draw) return <Roundel text={initials(clue.label)} colour={colour} />;
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex', flexShrink: 0, width: W, height: H,
        border: `1.5px solid ${colour}`, boxSizing: 'content-box',
        boxShadow: '0 1px 2px rgba(26,20,16,0.22)', background: 'var(--card-a)',
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {draw()}
      </svg>
    </span>
  );
}
