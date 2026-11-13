/**
 * The daily run's tasks: one constant, read by every screen and the share
 * line (docs/daily-run.md, section 1). Names are config, baked in nowhere,
 * so renaming a task is one edit here.
 *
 * `clockMs` is the clock for one item (a career, a step, a goal). It caps
 * the item and never scores. First guesses, tuned at the playtest.
 */
export type TaskId = 'spoofed' | 'step' | 'pin' | 'mole' | 'order' | 'season';

export interface RunTaskDef {
  id: TaskId;
  name: string;
  rule: string;
  /** Items in the run's round: careers, steps, goals. */
  items: number;
  clockMs: number;
}

/** In the fixed order of the run. */
export const RUN_TASKS: readonly RunTaskDef[] = [
  { id: 'spoofed', name: 'Check the rumours', rule: 'One move in each career never happened. Find it.', items: 2, clockMs: 30_000 },
  { id: 'step', name: 'Trace the link', rule: 'Name a player who fits the gap.', items: 2, clockMs: 45_000 },
  { id: 'pin', name: 'Log the shot', rule: 'Pin where each goal was struck from.', items: 3, clockMs: 20_000 },
  { id: 'mole', name: 'Find the mole', rule: "One name in this XI didn't start. Find it.", items: 1, clockMs: 40_000 },
  { id: 'order', name: 'Line them up', rule: 'Put them in order.', items: 2, clockMs: 30_000 },
  { id: 'season', name: 'Read the season', rule: 'Name the club. Then the season.', items: 1, clockMs: 30_000 },
];

/** Read the season: `clockMs` is a club guess; the season pick has its own. */
export const SEASON_PICK_MS = 20_000;

/** A Steps reveal in the run stops here and lands on its rest state. */
export const RUN_REVEAL_MS = 2_000;

/** The best moment's tie-break, when two tasks score the same (section 4). */
export const FIND_ORDER: readonly TaskId[] = ['step', 'season', 'pin', 'spoofed', 'mole', 'order'];

/** One finished task, as the run keeps it. `find` is its best moment, in one line, when it had one. */
export interface TaskResult {
  /** 0 to 100, one decimal. */
  score: number;
  find?: string;
  /** The find's own item score (one career, one pick), which ranks finds: the best moment, not the best task. */
  findScore?: number;
}

/**
 * What the shell hands a game's RunTask. The task plays its items, each under
 * its own clock (RunClock), and calls `onDone` when the player presses the
 * last red button, labelled `next`.
 */
export interface RunTaskProps {
  date: string;
  def: RunTaskDef;
  next: string;
  onDone: (result: TaskResult) => void;
}
