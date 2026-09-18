'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import ChainInk, { type InkHandle } from './ChainInk';
import { linkPairs } from '../src/lib/chain/score';
import { useCountUp } from './countUp';
import ChainRow from './ChainRow';
import SheetPins from './SheetPins';
import Pin from './Pin';
import { useInk } from './Stamp';
import { columnSchedule, columnSpecFor, type ColumnSpec } from './DepthColumn';
import { EmptyPlate } from './PlayerCard';
import { tiltFor } from './swing';
import { plateName } from '../src/lib/short-name';
import { shareText } from '../src/lib/chain/result';
import type { ChainResult, PinnedAnswer } from '../src/lib/chain/result';
import { neighboursOf, type ChainLink } from '../src/lib/chain/score';
import type { ChainDifficulty, ChainPuzzle } from '../src/lib/chain/types';
import type { Player } from '../src/lib/chemistry/types';
import { clubColour, splitRing, SIGNATURE_CLUB } from '../src/lib/club-colours';
import { shortClubName } from './ClubBadge';
import type { ClubView } from '../src/lib/clubs';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * The sealed sheet.
 *
 * This screen is the whole game. Everything before it is typing names into a
 * box; this is the only moment the player finds out whether they were right,
 * and the only moment they learn what they walked past.
 *
 * It is the SAME sheet they were just filling in — same clip, same masthead,
 * same chain, drawn by the same component — with the answers on it. That is
 * deliberate and it is the reason the reveal is not a modal with a score in
 * it: the thing being handed back has to be recognisably the thing they were
 * working on, or the result belongs to the application rather than to them.
 *
 * The sequence:
 *
 *   1. Link by link, left to right: the twine goes on slack, the club that
 *      made the link is STAMPED onto the connector and the paper takes the
 *      hit, and only then does the rope pull taut. A link that did not hold
 *      gets NO LINK in red and the rope parts. Cause, then effect — the
 *      stamp is the verdict, the rope is what the verdict does.
 *   2. CHAIN HELD or CHAIN BROKE comes down as a stamp across the band, and
 *      the score lands in gold foil beside it.
 *   3. The columns run, one blank at a time: a countdown from the size of
 *      the field to the rank of the pick, which is the obscurity told as a
 *      stop rather than as a number. See DepthColumn.
 *   4. Only then does the sheet admit how many ways it could have gone, and
 *      show the answers that were sitting there.
 *
 * That order matters. Showing the misses before the verdict would turn relief
 * into arithmetic; showing them at all is what makes the next chain worth
 * playing, because the thing a player remembers is not the 62 they scored, it
 * is the name they had never heard of that was there the whole time.
 */

/** Where the reveal has got to. Each step is one beat of the sequence. */
type Stage = 'arming' | 'resolving' | 'sealing' | 'verdict' | 'score' | 'detail';

/**
 * The reveal's tempo, in seconds. One link is: the pen draws to the die,
 * the die comes down, the line takes its colour, the pen carries on. The
 * next link's pen sets off while this one's is finishing, so the run reads
 * as one hand at work rather than a list of events.
 */
const PEN_IN = 0.3;       // card to die
const PEN_OUT = 0.32;     // die to next card
const AFTER_DIE = 0.14;   // the pause between the die landing and the pen moving on
const LINK_EVERY = 0.62;  // one link's start to the next's
const SEAL_PER_LINK = 0.22; // the seal's stroke, per link, before easing

/** The strong curves. Built-in eases are too weak to feel intentional. */
const EASE_OUT = 'power3.out';
const EASE_IN_OUT = 'power2.inOut';

const PENCIL = 'rgba(26,20,16,0.5)';
const GREEN = '#2f6b3f';
const RED = '#b3341f';

const GRADE: Record<ChainDifficulty, string> = {
  easy: 'var(--green)',
  medium: 'var(--gold)',
  hard: 'var(--accent)',
};

export default function LockIn({
  result, puzzle, fill, links, pool, images, clubs, onDismiss,
}: {
  result: ChainResult;
  puzzle: ChainPuzzle;
  fill: readonly (string | null)[];
  links: readonly ChainLink[];
  pool: ReadonlyMap<string, Player>;
  /** Player id to a ready picture. See src/lib/portraits.ts. */
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
  onDismiss: () => void;
}) {
  const [stage, setStage] = useState<Stage>('arming');
  const [stampedThrough, setStampedThrough] = useState(-1);
  const [inkReady, setInkReady] = useState(false);
  const pen = useRef<InkHandle>(null);
  const board = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLElement | null)[]>([]);
  const crests = useRef<(HTMLElement | null)[]>([]);
  const pairs = useMemo(() => linkPairs(fill.length, puzzle.closed ?? false), [fill.length, puzzle.closed]);
  const onInkReady = useCallback(() => setInkReady(true), []);
  const [columnsRun, setColumnsRun] = useState(0);
  const mode = puzzle.mode ?? 'clubs';
  const closed = puzzle.closed ?? false;
  const clues = puzzle.clues ?? {};
  // A completion board: the string runs and the verdict comes down as
  // before, but there are no columns to run, no foil to count up and no
  // wall of deeper answers — the sheet holds up the name each plate was
  // built around, and that is the reveal. See `ChainPuzzle.scoring`.
  const completion = puzzle.scoring === 'completion';
  const ink = useInk();

  // The paper taking a hit. Written straight to the node rather than through
  // state, and through the Web Animations API rather than a class, because
  // the paper already carries its rise-in as an inline animation and a class
  // would lose to it. A millimetre, not a slam: three stamps and a verdict
  // are four hits in as many seconds.
  const paper = useRef<HTMLDivElement>(null);
  const jolt = useCallback((hard = false) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    paper.current?.animate(
      [
        { transform: 'none' },
        { transform: hard ? 'translateY(2px) rotate(0.06deg)' : 'translateY(1.2px)', offset: 0.35 },
        { transform: hard ? 'translateY(-0.6px)' : 'translateY(-0.4px)', offset: 0.65 },
        { transform: 'none' },
      ],
      { duration: hard ? 300 : 220, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' },
    );
  }, []);

  // Everything the columns need, computed once; the row asks per slot.
  const columns = useMemo(() => {
    const map = new Map<number, ColumnSpec>();
    for (const slot of result.slots) map.set(slot.index, columnSpecFor(slot, pool, images));
    return map;
  }, [result, pool, images]);

  // The whole reveal is ONE timeline, built once the ink knows where every
  // card and die is. Everything on it — the pen, the dies, the seal, the
  // verdict, the columns — is placed at a time on that one clock, so the
  // sequence can be read top to bottom here and nothing can drift.
  useEffect(() => {
    if (!inkReady || !pen.current) return;
    const draw = pen.current;
    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });
    // Reduced motion: the same sheet, arrived at rather than performed.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) tl.timeScale(12);

    tl.call(() => setStage('resolving'), [], 0.5);

    // Every link is judged, including the ones after a break. The first
    // draft stopped the run dead at the first failure, which read well but
    // lied: the line under it says "2 of 4 links held" and the player could
    // only see one verdict. Watching a later link survive a broken chain is
    // also the part that stings usefully — you were one name away.
    let t = 0.6;
    for (let i = 0; i < result.links.length; i++) {
      const held = result.links[i]!;
      const die = t + PEN_IN;
      tl.add(draw.draw(i, 'crest', PEN_IN, EASE_OUT), t);
      tl.call(() => { setStampedThrough(i); jolt(); }, [], die);
      tl.add(draw.tint(i, held ? GREEN : RED, 0.28), die + 0.05);
      tl.add(draw.draw(i, 'end', PEN_OUT, EASE_IN_OUT), die + AFTER_DIE);
      t += LINK_EVERY;
    }
    let after = t - LINK_EVERY + PEN_IN + AFTER_DIE + PEN_OUT;

    // A chain that held gets the seal before the verdict: one solid stroke
    // runs every link in a single motion, pressing each die as it passes,
    // and the loop is closed. CHAIN HELD then lands on a board that has
    // just shown it. A chain that broke gets the verdict straight away.
    if (result.perfect) {
      const run = 0.4 + result.links.length * SEAL_PER_LINK;
      tl.call(() => setStage('sealing'), [], after + 0.2);
      tl.add(draw.seal(run, EASE_IN_OUT, (li) => {
        const die = crests.current[li];
        if (die) gsap.fromTo(die, { scale: 1 }, { scale: 0.93, duration: 0.11, ease: 'power2.out', yoyo: true, repeat: 1 });
      }), after + 0.3);
      tl.add(draw.fade(0.5), after + 0.3 + run - 0.1);
      after += 0.3 + run + 0.35;
    }
    tl.call(() => setStage('verdict'), [], after + 0.2);
    tl.call(() => jolt(true), [], after + 0.4);
    tl.call(() => setStage('score'), [], after + 0.9);

    // The columns, one after the other, each given exactly as long as its
    // countdown needs. Their timing is a pure function of the result, so
    // the sheet can schedule what follows without waiting on a callback.
    let c = after + 1.5;
    if (!completion) {
      result.slots.forEach((slot, j) => {
        tl.call(() => setColumnsRun(j + 1), [], c);
        c += (columnSchedule(slot.held ? slot.depth : null).total + 380) / 1000;
      });
    }
    tl.call(() => setStage('detail'), [], c + 0.2);

    // In development the timeline is on the window, so the reveal can be
    // paused, scrubbed or played at quarter speed from the console —
    // `__reveal.timeScale(0.25)` — which is how timing gets judged: slow,
    // and the next day.
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __reveal?: gsap.core.Timeline }).__reveal = tl;

    return () => { tl.kill(); };
  }, [inkReady, result, jolt, completion]);

  const showScore = stage === 'score' || stage === 'detail';
  const detail = stage === 'detail';
  const verdictUp = stage === 'verdict' || showScore;
  // The clue on a plate is judged with the verdict, not link by link: it is
  // a fact about the pick, not about either of its links.
  const judged = stage === 'sealing' || stage === 'verdict' || showScore;
  const plateCount = result.slots.length;
  const platesHeld = result.slots.filter((s) => s.held).length;
  // Every link real and the board still not solved: a plate answered by
  // someone it did not ask for. Named, because "3 of 4 plates held" under
  // a string that is taut all the way round explains nothing.
  const missedClues = result.slots.filter((s) => !s.clueMet && clues[s.index]);
  const cluesOnly = completion && result.made === result.total && !result.perfect;
  const missedLine = missedClues
    .map((s) => `plate ${s.index + 1} asked for ${clues[s.index]!.label}`)
    .join(', ');

  /**
   * The ring on each print, now that the verdict is out: the clubs that
   * actually made this player fit, split down the middle. A pick whose links
   * did not hold gets no clubs to show, so it wears the accent instead.
   */
  const ringFor = useCallback((i: number): string => {
    const id = fill[i];
    if (!id) return 'var(--accent)';
    if (puzzle.slots[i] != null) {
      return clubColour(SIGNATURE_CLUB[id] ?? pool.get(id)?.clubIds[0]);
    }
    const held = neighboursOf(i, fill.length, closed).map(({ link }) => links[link]).filter((l) => l?.made);
    if (held.length === 0) return 'var(--accent)';
    const [a, b] = held.map((l) => clubColour(l!.required ?? l!.clubs[0]));
    return b === undefined ? a! : splitRing(a!, b, 'var(--card-a)');
  }, [fill, puzzle.slots, links, pool, closed]);

  const columnFor = useCallback((i: number) => columns.get(i) ?? null, [columns]);
  const columnRunFor = useCallback(
    (i: number) => result.slots.findIndex((s) => s.index === i) < columnsRun,
    [result.slots, columnsRun],
  );

  const count = ['no', 'one', 'two', 'three', 'four', 'five'][result.slots.length] ?? String(result.slots.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chain result"
      className="sheet"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        overflowY: 'auto', padding: '40px 26px 44px',
        animation: 'lockin-in 300ms ease-out both',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* ── THE SHEET ───────────────────────────────────────────────── */}
        <div
          ref={paper}
          className="paper"
          style={{ position: 'relative', padding: '40px 30px 26px', animation: 'sheet-rise 520ms cubic-bezier(0.2,0.9,0.3,1) both' }}
        >
          <SheetPins />
          {ink.defs}

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, borderBottom: '3px solid var(--ink)', paddingBottom: 11 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div className="narrow" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Scouting sheet &middot; {count} to find
              </div>
              <div className="slab misreg" style={{ fontSize: 46, lineHeight: 0.96 }}>
                <span className="lean">CHAIN</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
              {puzzle.difficulty ? (
                <div className="narrow stamp" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GRADE[puzzle.difficulty] }}>
                  {puzzle.difficulty}
                </div>
              ) : null}
              <div style={{ width: 1, height: 36, background: 'rgba(26,20,16,0.22)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <div className="narrow" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  No.
                </div>
                <div className="slab" style={{ fontSize: 26, lineHeight: 1 }}>{puzzle.id}</div>
              </div>
            </div>
          </div>

          {/* The chain. The ink draws it link by link as the dies come down;
              if every one held, the seal runs it. This box is the ink's
              coordinate space. */}
          <div ref={board} style={{ position: 'relative', padding: '30px 0 4px' }}>
            <ChainRow
              fill={fill}
              slots={puzzle.slots}
              links={links}
              mode={mode}
              clubs={clubs}
              images={images}
              players={pool}
              revealed
              interactive={false}
              ringFor={ringFor}
              depthFor={() => null}
              revealDelayFor={(i) => i * 140}
              pinsDriving
              pinBeat={130}
              stampedThrough={stampedThrough}
              columnFor={completion ? undefined : columnFor}
              columnRunFor={columnRunFor}
              closed={closed}
              clues={clues}
              clueMetFor={(i) => (judged ? result.slots.find((s) => s.index === i)?.clueMet ?? null : null)}
              inked
              cellRef={(i, el) => { cells.current[i] = el; }}
              crestRef={(li, el) => { crests.current[li] = el; }}
            />
            <ChainInk
              ref={pen}
              box={board}
              cells={cells}
              crests={crests}
              pairs={pairs}
              pencil={PENCIL}
              ink={GREEN}
              onReady={onInkReady}
            />
          </div>

          {/* ── THE VERDICT ─────────────────────────────────────────────
              Same geometry as the brief band on the live sheet: a statement
              on the left, a block on the right. The block is gold now. */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'stretch', border: '2.5px solid var(--ink)', minHeight: 86 }}>
            <div style={{ flexGrow: 1, padding: '14px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
              {!verdictUp ? (
                <div className="narrow" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.3em', color: 'var(--muted)' }}>
                  {stage === 'sealing' ? 'EVERY LINK HELD…' : 'CHECKING THE LINKS…'}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                  {/* The verdict comes down as a die, not as type. */}
                  <div
                    className="slab"
                    style={{
                      display: 'inline-block', position: 'relative',
                      border: `3px solid ${result.perfect ? 'var(--green)' : 'var(--accent)'}`,
                      color: result.perfect ? 'var(--green)' : 'var(--accent)',
                      padding: '4px 14px 6px', fontSize: 30, lineHeight: 1, whiteSpace: 'nowrap',
                      boxShadow: `inset 0 0 0 2px rgba(247,242,230,0.9), inset 0 0 0 5px ${result.perfect ? 'var(--green)' : 'var(--accent)'}`,
                      background: 'rgba(247,242,230,0.5)',
                      filter: ink.filter,
                      ['--lean' as string]: '-4deg',
                      animation: 'stamp-in-flow 420ms cubic-bezier(0.3,1.25,0.4,1) both',
                    }}
                  >
                    {result.perfect ? 'CHAIN HELD' : cluesOnly ? 'NOT SOLVED' : 'CHAIN BROKE'}
                  </div>
                  <div className="read" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--soft)', animation: 'frayed-in 300ms ease 300ms both' }}>
                    {completion
                      ? result.perfect
                        ? 'Every link a real one, every plate answered.'
                        : cluesOnly
                          ? `Every link held, but ${missedLine}.`
                          : `${platesHeld} of ${plateCount} plates held.`
                      : result.perfect
                        ? 'Every link a real one.'
                        : `${result.made} of ${result.total} links held. A broken link scores nothing.`}
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                width: 176, flexShrink: 0, borderLeft: '2.5px solid var(--ink)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: showScore
                  ? 'linear-gradient(148deg, #e6cb8c, #a8791f 44%, #dcb968 70%, #85601a)'
                  : 'var(--panel-2)',
                transition: 'background 620ms ease',
              }}
            >
              {showScore
                ? completion
                  ? <PlatesReveal held={platesHeld} of={plateCount} />
                  : <ScoreReveal value={result.score} />
                : (
                  <div className="slab" style={{ fontSize: 34, color: 'rgba(26,20,16,0.2)' }}>&mdash;</div>
                )}
            </div>
          </div>

          {/* ── WHAT THE BOARD WAS ──────────────────────────────────────
              The artboard's foil band. It states the size of the answer
              space, which is a fact about the answer and therefore could
              only ever appear here. */}
          {detail && !completion && result.pairs !== null ? (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'stretch', border: '2.5px solid var(--ink)', animation: 'foil-in 460ms ease-out 120ms both' }}>
              <div style={{ flexGrow: 1, padding: '13px 20px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <div className="narrow" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {result.slots.map((s, i) => `${s.fieldSize} fit the ${['first', 'second', 'third', 'fourth'][i] ?? `${i + 1}th`}`).join(' · ')}
                </div>
                {puzzle.caption ? (
                  <div className="slab" style={{ fontSize: 20, lineHeight: 1.15 }}>{puzzle.caption}</div>
                ) : null}
              </div>
              <div
                style={{
                  width: 150, flexShrink: 0, borderLeft: '2.5px solid var(--ink)',
                  background: 'linear-gradient(148deg, #e6cb8c, #a8791f 44%, #dcb968 70%, #85601a)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 6px',
                }}
              >
                <div className="slab" style={{ fontSize: 38, lineHeight: 0.95, color: '#fffdf7', textShadow: '0 2px 0 rgba(70,48,6,0.55)', fontVariantNumeric: 'tabular-nums' }}>
                  {result.pairs}
                </div>
                <div className="narrow" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#46300a' }}>
                  Ways to fill it
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── THE PINBOARD ────────────────────────────────────────────── */}
        {detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 4px 0', animation: 'foil-in 460ms ease-out 240ms both' }}>
            <div style={{ borderBottom: '2px solid rgba(26,20,16,0.42)', paddingBottom: 7 }}>
              <div className="slab misreg" style={{ fontSize: 20 }}>
                <span className="lean">{completion ? 'THE ONES WE HAD IN MIND' : 'WHO WOULD HAVE WORKED'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 6 }}>
              {completion
                // One print per plate, in plate order: the answer the board
                // was made around. A different name that also held is not
                // wrong — the tag says so — it is just not the one we meant.
                ? result.slots.map((slot, i) => slot.obvious ? (
                  <div key={slot.index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div className="narrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      Plate {slot.index + 1}
                    </div>
                    <Pinned
                      answer={{ ...slot.obvious, score: 0, either: false, slotIndex: slot.index, fieldSize: slot.fieldSize, mine: slot.playerId === slot.obvious.id }}
                      images={images}
                      clubs={clubs}
                      order={i}
                      tag={slot.playerId === slot.obvious.id ? 'You found it' : slot.held ? 'Yours held too' : null}
                    />
                  </div>
                ) : null)
                : result.pinboard.map((answer, i) => (
                  <Pinned key={answer.id} answer={answer} images={images} clubs={clubs} order={i} />
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={onDismiss}
                  className="narrow"
                  style={{
                    background: 'transparent', color: 'var(--soft)',
                    border: '2px solid var(--border)', borderRadius: 0,
                    padding: '12px 22px', fontWeight: 700, fontSize: 13,
                    letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  Back to the sheet
                </button>
                <CopyButton text={shareText(result, puzzle.id)} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Mounted only when the score is due, so the count-up starts on arrival. */
function ScoreReveal({ value }: { value: number }) {
  const score = useCountUp(value, 0, 1100);
  return (
    <div style={{ textAlign: 'center', animation: 'verdict-in 380ms cubic-bezier(0.2,1.4,0.4,1) both' }}>
      <div
        className="slab"
        style={{
          fontSize: 52, lineHeight: 0.92, color: '#fffdf7',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 0 rgba(70,48,6,0.55)',
        }}
      >
        {score}
      </div>
      <div className="narrow" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', color: '#46300a', textAlign: 'center' }}>
        RARITY FOIL
      </div>
    </div>
  );
}

/** The completion board's gold block: plates held, out of plates. */
function PlatesReveal({ held, of }: { held: number; of: number }) {
  return (
    <div style={{ textAlign: 'center', animation: 'verdict-in 380ms cubic-bezier(0.2,1.4,0.4,1) both' }}>
      <div
        className="slab"
        style={{
          fontSize: 44, lineHeight: 0.92, color: '#fffdf7',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 0 rgba(70,48,6,0.55)',
        }}
      >
        {held}/{of}
      </div>
      <div className="narrow" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', color: '#46300a', textAlign: 'center' }}>
        PLATES HELD
      </div>
    </div>
  );
}

/**
 * Copy the shareable line.
 *
 * The clipboard API rejects on an insecure origin and in a browser that has
 * not granted permission, and a share button that silently does nothing is
 * worse than one that admits it, so the failure has its own label.
 */
function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2200);
  }

  return (
    <button
      onClick={copy}
      className="narrow"
      style={{
        background: 'var(--ink)', color: 'var(--panel)', border: '2px solid var(--ink)', borderRadius: 0,
        padding: '12px 24px', fontWeight: 700, fontSize: 13,
        letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed — select it yourself' : 'Send the sheet'}
    </button>
  );
}

/**
 * One answer, pinned up.
 *
 * The frame is the reveal doing its job: the diagonal is the two clubs that
 * made this player fit, which is the fact the player was reaching for and did
 * not have. Text alone said "Raphaël Wicky · 8 would have fitted" and slid
 * straight off; a face and two colours is the bit that stays.
 */
function Pinned({
  answer, images, clubs, order, tag,
}: {
  answer: PinnedAnswer;
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
  order: number;
  /**
   * What the label under the print says, when the caller knows better
   * than the score does. Undefined leaves it to the answer; null prints
   * nothing.
   */
  tag?: string | null;
}) {
  const photo = images[answer.id];
  const [a, b] = answer.clubs;
  const ring = a === undefined
    ? 'var(--ink)'
    : splitRing(clubColour(a), clubColour(b ?? a), 'var(--card-a)');
  const tilt = tiltFor(`pinned-${answer.id}`, 2.4);
  // Deep enough that almost nobody would have got there. The threshold is the
  // same 80 the depth gauge treats as the far end of the track.
  const deepCut = answer.score >= 80;
  const label = tag !== undefined ? tag : answer.mine ? 'You found it' : deepCut ? 'Deep cut' : null;

  return (
    <div
      style={{
        width: 132, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        position: 'relative',
        ['--tilt' as string]: `${tilt}deg`,
        animation: `pinned-in 560ms cubic-bezier(0.22, 1.2, 0.36, 1) ${240 + order * 140}ms both`,
      }}
    >
      <div className="mount" style={{ padding: '6px 6px 0', position: 'relative' }}>
        <Pin colour="#a8791f" driving delay={420 + order * 140} />
        <div className="photo" style={{ width: 120, height: 128, background: ring }}>
          {photo ? (
            <img
              src={photo.url}
              alt=""
              style={{
                objectFit: photo.fit,
                objectPosition: photo.fit === 'cover' ? '50% 18%' : '50% 50%',
              }}
            />
          ) : (
            <EmptyPlate size={34} />
          )}
        </div>
        {/* The nameplate, by the same rule as every other card on the board.
            Printing the registered name here truncated "Marcelo António
            Guedes Filho" to "MARCELO ANTÓNIO G…", which is the one thing a
            nameplate must never do: the name is the whole payload. */}
        <div className="narrow" title={answer.name} style={{ width: 120, padding: '5px 0 6px', fontSize: 12, fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {plateName(answer.id, answer.name).toUpperCase()}
        </div>
      </div>
      {/* Two lines' worth of room whether the caption needs them or not.
          Without it a one-line caption pulls its DEEP CUT tag up level with
          the card above's second line, and a row of five prints reads as
          five different rows. */}
      <div className="read" style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.35, color: 'var(--soft)', minHeight: 30, width: '100%' }}>
        {answer.either ? (
          <>Fits <em>either</em> gap</>
        ) : answer.clubs.length === 2 ? (
          <>{shortClubName(clubs[answer.clubs[0]!]?.name ?? answer.clubs[0]!)} <em>and</em> {shortClubName(clubs[answer.clubs[1]!]?.name ?? answer.clubs[1]!)}</>
        ) : answer.clubs.length === 1 ? (
          shortClubName(clubs[answer.clubs[0]!]?.name ?? answer.clubs[0]!)
        ) : (
          'one that fitted'
        )}
      </div>
      {label ? (
        <div
          className="narrow"
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
            background: label === 'Deep cut' ? 'var(--ink)' : 'var(--green)', color: '#f7f2e6', padding: '3px 8px',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
