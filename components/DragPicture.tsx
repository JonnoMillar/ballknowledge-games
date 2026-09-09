'use client';
import PlayerCard from './PlayerCard';
import { useSwing } from './swing';
import { NEUTRAL } from '../src/lib/club-colours';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * The card while it is in your hand.
 *
 * dnd-kit puts a clone under the cursor; everything that makes it feel like an
 * object rather than a cursor decoration is here. Two layers, because they are
 * doing different jobs and must not share a transform:
 *
 *   outer — the swing. Owned frame by frame by `useSwing`, which is a spring
 *           and will overwrite anything else written to `transform`.
 *   inner — the lift: the shadow it throws and the small amount of scale that
 *           says it is nearer the eye than the board is.
 */
export default function DragPicture({
  player, images,
}: {
  player: Player;
  images: Record<string, PortraitImage>;
}) {
  const ref = useSwing({ active: true, scale: 1.06 });

  return (
    <div ref={ref} style={{ pointerEvents: 'none' }}>
      <div className="lifted" style={{ borderRadius: 1 }}>
        <PlayerCard
          player={player}
          variant="library"
          images={images}
          obscurity={null}
          // Neutral, always. A card in mid-air must not start showing which
          // clubs would make it fit — that is the answer, and the player has
          // not committed to anything yet.
          ring={NEUTRAL}
        />
      </div>
    </div>
  );
}
