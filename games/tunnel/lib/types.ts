import type { PortraitImage } from '../../../src/lib/portraits';
import type { Finale } from './rules';

/** What crosses the wire: the five and the club, never a value until its line is locked. */
export interface TunnelPlayer { id: string; name: string; image: PortraitImage | null; ground: string }
export interface TunnelDay {
  date: string;
  day: number;
  club: { id: string; name: string };
  /** In walk-out order. */
  players: TunnelPlayer[];
  finale?: Finale;
  preview?: boolean;
}
/** One category's values, per player in walk-out order (rules.ts Values). */
export interface Locked { values: number[] }
