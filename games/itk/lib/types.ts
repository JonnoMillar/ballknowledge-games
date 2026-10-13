import type { PortraitImage } from '../../../src/lib/portraits';

/** What crosses the wire. Where the fake is, and what it hid, never does until the round is over. */
export interface ItkStop { clubId: string; name: string; year: number; loan: boolean }
export interface ItkRound { player: { id: string; name: string }; image: PortraitImage | null; ground: string; stops: ItkStop[] }
export interface ItkDay { date: string; day: number; rounds: ItkRound[] }

/** `real` is the club the fake covered; null for an inserted fake, which covered nothing. */
export interface Verdict { fake: boolean; fakeIndex: number | null; real: { clubId: string; name: string } | null }
