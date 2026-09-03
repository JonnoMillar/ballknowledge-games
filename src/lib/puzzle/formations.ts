import type { Formation } from './types';

/**
 * 4-3-3. Sixteen edges, every slot linked at least twice.
 * Degree per slot: GK 2, LB 2, LCB 4, RCB 4, RB 2, LCM 4, CM 3, RCM 4,
 * LW 2, ST 3, RW 2 — summing to 32, which is 2 x 16 edges.
 */
export const FORMATION_433: Formation = {
  id: '433',
  slots: [
    { id: 'GK', position: 'GK', x: 50, y: 95 },
    { id: 'LB', position: 'DEF', x: 15, y: 75 },
    { id: 'LCB', position: 'DEF', x: 38, y: 80 },
    { id: 'RCB', position: 'DEF', x: 62, y: 80 },
    { id: 'RB', position: 'DEF', x: 85, y: 75 },
    { id: 'LCM', position: 'MID', x: 28, y: 50 },
    { id: 'CM', position: 'MID', x: 50, y: 55 },
    { id: 'RCM', position: 'MID', x: 72, y: 50 },
    { id: 'LW', position: 'FWD', x: 18, y: 20 },
    { id: 'ST', position: 'FWD', x: 50, y: 15 },
    { id: 'RW', position: 'FWD', x: 82, y: 20 },
  ],
  adjacency: [
    ['GK', 'LCB'], ['GK', 'RCB'],
    ['LB', 'LCB'], ['LB', 'LCM'],
    ['LCB', 'RCB'], ['LCB', 'LCM'],
    ['RCB', 'RB'], ['RCB', 'RCM'],
    ['RB', 'RCM'],
    ['LCM', 'CM'], ['LCM', 'LW'],
    ['CM', 'RCM'], ['CM', 'ST'],
    ['RCM', 'RW'],
    ['LW', 'ST'], ['ST', 'RW'],
  ],
};

export const FORMATIONS: Readonly<Record<string, Formation>> = {
  [FORMATION_433.id]: FORMATION_433,
};
