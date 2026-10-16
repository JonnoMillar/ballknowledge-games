import type { Story } from './drama';
import type { TopScorer } from './wiki';

/** One finished season, as stored: everyone's line and every club's top scorer. Never changes once written. */
export interface StoredSeason {
  /** "2015-16". */
  id: string;
  start: number;
  games: number;
  champion: string;
  /** Club (football-data short name) to its position after each game. */
  table: Record<string, number[]>;
  /** The raw infobox field (wikitext), parsed when the boards are built, so a parser fix needs no refetch. */
  top: Record<string, string | null>;
}

/** A club-season worth playing, with its hints worked out. Rebuilt from the seasons, careers and pool. */
export interface StoredBoard {
  /** "2015-16|Leicester". Server-only: it is the answer. */
  id: string;
  season: string;
  start: number;
  club: string;
  stories: Story[];
  score: number;
  /** 0 to 1: the share of PL seasons the club has played. */
  fame: number;
  rival: string;
  squad: [string, string];
  top: TopScorer;
}

export interface StoredData {
  clubs: Record<string, { name: string; q: string | null }>;
  seasons: StoredSeason[];
  boards: StoredBoard[];
}

export interface StoredDay { date: string; board: string }

/** A guess as the player makes it: a club's short name and a season's start year. */
export interface Guess { club: string; start: number }

export interface Judged extends Guess {
  clubRight: boolean;
  /** 0 right; 1 the answer is later; -1 earlier. */
  season: -1 | 0 | 1;
}

/** Everything the page may know at this point of a board. The answer only once it is over. */
export interface BoardView {
  id: string;
  /** "Daily #3", or null in endless. */
  day: number | null;
  date: string | null;
  games: number;
  teams: number;
  /** The years a guess may name, oldest first. */
  range: [number, number];
  /** Clubs a guess may name: every club that was in the PL in the range. Any season in the range may be named with any of them. */
  clubs: { club: string; name: string; q: string | null; colour: string }[];
  judged: Judged[];
  /** Positions shown so far. */
  line: number[];
  /** Other clubs' lines on the chart: one after the first miss, three after the third. */
  rivals: { club: string; name: string; q: string | null; colour: string; line: number[] }[];
  /** A squad player after the second miss; the top scorer after the fourth. */
  hints: { squad: string | null; top: TopScorer | null };
  done: boolean;
  won: boolean;
  answer: { club: string; name: string; q: string | null; start: number; champion: string; championName: string } | null;
}

export const GUESSES = 5;
