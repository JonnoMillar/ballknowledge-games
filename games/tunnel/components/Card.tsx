'use client';
import { useEffect, useState } from 'react';
import { Figure } from '../../../components/Sticker';
import type { PortraitImage } from '../../../src/lib/portraits';
import type { Category } from '../lib/rules';
import type { TunnelPlayer } from '../lib/types';

/** Category names, and the two ends of each line. */
export const LABEL: Record<Category, string> = { age: 'Age', height: 'Height', apps: 'Apps', goals: 'Goals', clubs: 'Clubs', rating: 'FIFA', followers: 'Instagram' };
export const ENDS: Record<Category, [string, string]> = {
  age: ['Youngest', 'Oldest'],
  height: ['Shortest', 'Tallest'],
  apps: ['Fewest', 'Most'],
  goals: ['Fewest', 'Most'],
  clubs: ['Fewest', 'Most'],
  rating: ['Lowest', 'Highest'],
  followers: ['Fewest', 'Most'],
};
/** How each category reads on a card once its values are in. */
export function shown(cat: Category, v: number): { big: string; unit: string } {
  switch (cat) {
    case 'age': {
      const d = new Date(-v * 86400000);
      return { big: String(d.getUTCFullYear()), unit: d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) };
    }
    case 'height': return { big: String(v), unit: 'cm' };
    case 'apps': return { big: String(v), unit: v === 1 ? 'game' : 'games' };
    case 'goals': return { big: String(v), unit: v === 1 ? 'goal' : 'goals' };
    case 'clubs': return { big: String(v), unit: v === 1 ? 'club' : 'clubs' };
    case 'rating': return { big: String(v), unit: 'OVR' };
    case 'followers': return { big: v.toLocaleString('en-GB', { notation: 'compact', maximumFractionDigits: 2 }), unit: 'followers' };
  }
}

/**
 * One player in the line: a face on their club's ground and the name. A row
 * on a phone, a sticker on a desk (tunnel.css). Once the line is locked it
 * carries the value and whether it stood in the right place.
 */
export function Card({ player, idx, cat, value, shown: out = true, roll, right, selected, dragging, onPick, onDown, disabled }: {
  player: TunnelPlayer;
  /** The player's place in the day's five: how the line finds this card's element. */
  idx: number;
  cat: Category;
  value: number | null;
  /** False while the value has come back but this card has not yet shown it. */
  shown?: boolean;
  /** Count the number up as it lands. */
  roll?: boolean;
  right: boolean | null;
  selected?: boolean;
  dragging?: boolean;
  onPick?: () => void;
  onDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) {
  const v = value === null ? null : shown(cat, value);
  const cls = ['tn-card', 'vt', selected ? 'is-selected' : '', dragging ? 'is-dragging' : '', out && roll && v ? 'is-new' : '', right === true ? 'is-right' : right === false ? 'is-wrong' : ''].filter(Boolean).join(' ');
  return (
    <li className="tn-slot">
      <button type="button" className={cls} data-p={idx} onClick={onPick} onPointerDown={onDown} disabled={disabled} aria-pressed={selected}>
        <span className="tn-card__photo" style={{ background: player.ground }}>
          <Photo image={player.image} />
        </span>
        <span className="tn-card__name display">{player.name}</span>
        {v ? (
          <span className="tn-card__value" style={out ? undefined : { visibility: 'hidden' }} title={cat === 'followers' ? value!.toLocaleString('en-GB') : undefined}>
            <b className="display">{roll && out && cat !== 'age' ? <Roll to={value!} cat={cat} /> : v.big}</b> <span>{v.unit}</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

/** A number that counts up to its value as it lands. */
function Roll({ to, cat }: { to: number; cat: Category }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 420);
      setN(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{shown(cat, n).big}</>;
}

/** A face, or the silhouette when there is none or its link has died. */
export function Photo({ image }: { image: PortraitImage | null }) {
  const [dead, setDead] = useState(false);
  return image && !dead
    ? <img src={image.url} alt="" draggable={false} style={{ objectFit: image.fit }} onError={() => setDead(true)} />
    : <Figure tone="rgba(255,255,255,0.55)" />;
}
