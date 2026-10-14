import type { Grade } from '../../../src/lib/chain/grade';
import type { ClubView } from '../../../src/lib/clubs';
import type { PortraitImage } from '../../../src/lib/portraits';

/**
 * What crosses the wire. A day carries its givens and nothing about any
 * step's answers; a verdict carries the step's deepest answer, which the
 * page keeps back until the run is over.
 */
export interface StepClub { id: string; club: ClubView; colour: string }
export interface StepGiven { id: string; name: string; image: PortraitImage | null; ground: string }
export interface StepOf { player: StepGiven; club: StepClub; playerFirst: boolean }
export interface StepDay { date: string; day: number; steps: StepOf[] }

/** A player as a card: who, and the two clubs that made the step (link to the given, then the club). */
export interface StepCard { id: string; name: string; image: PortraitImage | null; clubs: [StepClub, StepClub] | null }
export interface Verdict { held: boolean; grade: Grade | null; pick: StepCard; elite: StepCard | null }
