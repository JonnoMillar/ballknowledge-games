'use client';
import { StickerFace, type Ground } from './Sticker';
import { GRADE_WORD, type Grade } from '../src/lib/chain/grade';
import type { Named } from '../src/lib/chain/client';
import type { PortraitImage } from '../src/lib/portraits';
import type { CardNews } from '../src/lib/collection';

/**
 * A graded card: the sticker sealed in a case, the case the grade.
 *
 * Bronze, silver and gold are drawn; sapphire, diamond and onyx are
 * photographic textures (public/grades). The case is the only thing that
 * ever catches the light: the glint runs behind the sticker, never across
 * the player's photo. The label says the grade and nothing else.
 */
export default function Slab({ grade, player, image, ground, news, size = 'md' }: {
  grade: Grade;
  player: Named;
  image: PortraitImage | undefined;
  ground: Ground;
  news?: CardNews;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className={`slab slab--${grade} slab--${size}`}>
      <span className="slab__face" aria-hidden>
        <span className="slab__inlay" />
        <span className="slab__glint" />
      </span>
      <span className="slab__label display">{GRADE_WORD[grade]}</span>
      <span className="slab__well">
        <StickerFace player={player} image={image} ground={ground} />
      </span>
      {news ? <span className="slab__news">{news === 'new' ? 'New' : 'Upgraded'}</span> : null}
    </div>
  );
}

/** The case without a card in it: a grade's name on its material. For keys and headings. */
export function GradeChip({ grade, label }: { grade: Grade; label?: string }) {
  return (
    <span className={`slab slab--${grade} grade-chip`}>
      <span className="slab__face" aria-hidden><span className="slab__inlay" /></span>
      <span className="slab__label display">{label ?? GRADE_WORD[grade]}</span>
    </span>
  );
}
