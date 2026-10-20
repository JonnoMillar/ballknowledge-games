import type { PortraitImage } from './portraits';
import type { ClubView } from './clubs';
import type { Grade } from './chain/grade';

/**
 * What a front page's How to play demo draws (components/HowItWorks.tsx):
 * real players and clubs, read on the server, nothing from a live day.
 */
export interface DemoSticker { id: string; name: string; image?: PortraitImage; ground: { a: string; b: string } }
export interface DemoClub { id: string; club: ClubView; colour: string }

/** Chain's puzzle: two givens, one gap with a clue, a club on each link. */
export interface ChainDemo { left: DemoSticker; gap: DemoSticker; right: DemoSticker; links: [DemoClub, DemoClub]; clue: { flag: string; label: string } }

/** Steps: a given and a club, and two answers that fit, graded as the game grades them. */
export interface StepsDemo { given: DemoSticker; club: DemoClub; picks: { player: DemoSticker; grade: Grade }[] }
