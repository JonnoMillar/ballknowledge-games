'use client';
import ClubBadge, { shortClubName } from './ClubBadge';
import HowItWorks, { type HowRule } from './HowItWorks';
import Slab from './Slab';
import { Figure, StickerFace, type Ground } from './Sticker';
import type { ChainDemo, DemoSticker, StepsDemo } from '../src/lib/demo';

/** Chain's two dailies on the shared How to play card (components/HowItWorks.tsx). */

const ground = (s: DemoSticker): Ground => ({ a: s.ground.a, b: s.ground.b, liveA: true, liveB: true });
const face = (s: DemoSticker, className = '') => (
  <StickerFace player={s} image={s.image} ground={ground(s)} className={`sticker--still ${className}`} />
);
const empty = (label = '?') => (
  <span className="sticker sticker--empty sticker--still">
    <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
    <span className="sticker__plate"><span className="sticker__no">{label}</span></span>
  </span>
);

const PUZZLE: HowRule[] = [
  { text: 'Each link is a club both players played for.', frames: [2600] },
  { text: 'Fill each gap with a player who fits its clue.', frames: [2800] },
  { text: 'Seal it once. The chain holds or it breaks.', frames: [3800] },
];

/**
 * The puzzle: Rooney, a Portuguese, Benzema. The crests land on the links;
 * Ronaldo drops into the gap on the grey ground every unsealed pick wears;
 * the seal develops his halves to United and Madrid, a tick on each link.
 */
export function PuzzleHow({ demo }: { demo: ChainDemo }) {
  const link = (n: 0 | 1) => (
    <span className={`chow__link chow__link--${n + 1}`}>
      <ClubBadge clubId={demo.links[n].id} club={demo.links[n].club} size={28} />
      <span className="chow__tick" aria-hidden>✓</span>
    </span>
  );
  return (
    <HowItWorks
      rules={PUZZLE}
      title="How the puzzle works"
      wide={false}
      demo={(step) => (
        <div className="chow" data-step={step}>
          <div className="chow__row">
            {face(demo.left)}
            {link(0)}
            <span className="chow__gap">
              {empty()}
              <span className="chow__pick">{face(demo.gap)}</span>
            </span>
            {link(1)}
            {face(demo.right)}
          </div>
          <span className="chow__clue"><img src={`/flags/${demo.clue.flag}.svg`} alt="" height={14} />{demo.clue.label}</span>
          <span className="chow__seal display">Seal it</span>
        </div>
      )}
    />
  );
}

const STEPS: HowRule[] = [
  { text: 'Name a player who played for this club and one of his.', frames: [2600] },
  { text: 'Any answer that fits holds.', frames: [2800] },
  { text: 'The rarer the answer, the better the card.', frames: [3400] },
];

/**
 * Steps: Rooney and Real Madrid. Ronaldo fits and gets the plainest case;
 * Heinze fits too, rarer, and gets a better one. Grades come from the
 * game's own rule (`demoSteps` in games/step/server.ts).
 */
export function StepsHow({ demo }: { demo: StepsDemo }) {
  const [obvious, rare] = demo.picks;
  const slab = (p: StepsDemo['picks'][number] | undefined, n: number) => p ? (
    <span className={`shw__card shw__card--${n}`}>
      <Slab grade={p.grade} player={p.player} image={p.player.image} ground={ground(p.player)} size="sm" />
    </span>
  ) : null;
  return (
    <HowItWorks
      rules={STEPS}
      title="How Steps works"
      wide={false}
      note="Four steps a day, one go at each."
      demo={(step) => (
        <div className="shw" data-step={step}>
          {face(demo.given)}
          <span className="shw__gap">
            {empty()}
            {slab(obvious, 1)}
            {slab(rare, 2)}
          </span>
          <span className="shw__club">
            <ClubBadge clubId={demo.club.id} club={demo.club.club} size={52} />
            <span className="shw__clubname display">{shortClubName(demo.club.club.name)}</span>
          </span>
        </div>
      )}
    />
  );
}

