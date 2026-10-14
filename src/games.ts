/**
 * Every game on the hub, in the order it suggests them. Adding a game is one
 * entry here plus its own route and icon; the hub reads nothing else.
 * Recall XI is parked, Slugger was dropped, and Deep Cuts is reached from
 * inside Chain (the two are due to merge), so none of them are here.
 */
export type GameCard = {
  id: string;
  href: string;
  name: string;
  /** What the hub's "up next" card says under the name. Three words at most. */
  line: string;
  /** `public/hub/<icon>.webp`. */
  icon: string;
  /** A daily is suggested until it is done today; the rest are suggested once every daily is. */
  daily: boolean;
  /** Pub games are never the suggestion: you need mates in the room. */
  pub?: boolean;
};

export const GAMES: readonly GameCard[] = [
  { id: 'chain', href: '/chain', name: 'Chain', line: 'Link the players', icon: 'chain', daily: true },
  { id: 'spoofed', href: '/spoofed', name: 'Spoofed', line: 'Spot the fake move', icon: 'spoofed', daily: true },
  { id: 'pin', href: '/pin', name: 'Pitch pin', line: 'Pin the goal', icon: 'pin', daily: false },
  { id: 'rondo', href: '/rondo', name: 'Rondo', line: 'Pass it round', icon: 'rondo', daily: false, pub: true },
];
