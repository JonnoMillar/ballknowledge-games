'use client';
import type { ReactNode } from 'react';
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
 *
 * The sheen is a light held still on the case, at rest unlit. Inside a
 * `.tilt` the case turns by --rx/--ry, and --lx/--ly/--lit place and light
 * the sheen in the grade's own colour: the reveal drives them on a timeline,
 * an opened card by the pointer.
 */
export default function Slab({ grade, player, image, ground, news, size = 'md', children }: {
  grade: Grade;
  player: Named;
  image: PortraitImage | undefined;
  ground: Ground;
  news?: CardNews;
  size?: 'sm' | 'md' | 'lg';
  /** Laid over the sticker in its well (Steps' reveal develops a silhouette off it). */
  children?: ReactNode;
}) {
  return (
    <div className={`slab slab--${grade} slab--${size}`}>
      <span className="slab__face" aria-hidden>
        <span className="slab__inlay" />
        <span className="slab__glint" />
        <span className="slab__sheen" />
      </span>
      <span className="slab__label display">{GRADE_WORD[grade]}</span>
      <span className="slab__well">
        <StickerFace player={player} image={image} ground={ground} />
        {children}
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
