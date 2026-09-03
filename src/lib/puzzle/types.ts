import type { LinkColour, PositionClass } from '../chemistry/types';

export interface Slot {
  id: string;
  position: PositionClass;
  /** Layout coordinates, 0..100 on both axes. Unused until the UI plan. */
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  slots: readonly Slot[];
  adjacency: readonly (readonly [string, string])[];
}

/** Map of slotId to playerId. */
export type Placement = Readonly<Record<string, string>>;

export interface Board {
  id: string;
  formationId: string;
  /** Slots revealed at the start. Spec 4 step 1. */
  seeded: Placement;
  /** Keyed by edgeKey(a, b). Spec 4.4. */
  required: Readonly<Record<string, LinkColour | 'any'>>;
  /** Proves the board is solvable. Never the required answer. Spec 4.4. */
  referenceSolution: Placement;
}
