/**
 * Every game on the hub, in the order it suggests them. Adding a game is one
 * entry here plus its own route and icon; the hub reads nothing else.
 * Recall XI is parked, Slugger was dropped, and Deep Cuts is archived, so
 * none of them are here. Step lives inside Chain's hub.
 */
export type GameCard = {
  id: string;
  href: string;
  name: string;
  /** Under the name when the game is the hub's suggestion, or on a pub game's wide tile. Three words at most, or the player count. */
  line: string;
  /** A one-word kind, on the tile's corner. */
  tag: string;
  /** `public/hub/<icon>.webp`, a cut-out miniature. None yet for a draft: the tile shows its ground. */
  icon?: string;
  /** The tile's ground, deep enough for white type and the green felt. */
  ground: string;
  /**
   * Today's dailies, as the ids they mark done in `src/lib/today`. The game is
   * suggested until all are done; one with none is suggested after the dailies.
   */
  dailies: string[];
  /** Pub games are never the suggestion: you need mates in the room. */
  pub?: boolean;
};

export const GAMES: readonly GameCard[] = [
  { id: 'chain', href: '/chain', name: 'Chain', line: 'Steps, then the puzzle', tag: 'Daily', icon: 'chain', ground: '#2A2622', dailies: ['step', 'chain'] },
  { id: 'spoofed', href: '/spoofed', name: 'Spoofed', line: 'Spot the fake move', tag: 'Daily', icon: 'spoofed', ground: '#5B2A86', dailies: ['spoofed'] },
  { id: 'pin', href: '/pin', name: 'Pitch pin', line: 'Pin the goal', tag: 'Packs', icon: 'pin', ground: '#2B4C9B', dailies: [] },
  { id: 'rondo', href: '/rondo', name: 'Rondo', line: '2 to 4 players, one phone', tag: 'Multiplayer', icon: 'rondo', ground: '#C9541A', dailies: [], pub: true },
  // Internal id `bluff` (its first working name), like Spoofed's `itk`.
  { id: 'bluff', href: '/odd-man-out', name: 'Odd Man Out', line: '2 or more players, one phone', tag: 'Multiplayer', icon: 'odd-man-out', ground: '#14615B', dailies: [], pub: true },
];
