'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCountUp } from './DepthGauge';
import ChainRow from './ChainRow';
import SheetPins from './SheetPins';
import Pin, { pinHead } from './Pin';
import RedString, { type Anchor } from './RedString';
import { EmptyPlate } from './PlayerCard';
import { tiltFor } from './swing';
import { plateName } from '../src/lib/short-name';
import { shareText } from '../src/lib/chain/result';
import type { ChainResult, PinnedAnswer, SlotOutcome } from '../src/lib/chain/result';
import type { ChainLink } from '../src/lib/chain/score';
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
 *   1. The string goes on, one span at a time, left to right. A span that
 *      held stays taut; a span that did not parts in the middle and drops.
 *   2. The verdict lands, with the score in gold foil beside it.
 *   3. Only then does the sheet admit how many ways it could have gone, and
 *      show the answers that were sitting there.
 *
 * That order matters. Showing the misses before the verdict would turn relief
 * into arithmetic; showing them at all is what makes the next chain worth
 * playing, because the thing a player remembers is not the 62 they scored, it
 * is the name they had never heard of that was there the whole time.
 */

/** Where the reveal has got to. Each step is one beat of the sequence. */
type Stage = 'arming' | 'resolving' | 'verdict' | 'score' | 'detail';

/** How long one span of string takes to go on. Matches RedString's own draw. */
const BEAT = 620;

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
  const [resolved, setResolved] = useState(-1);
  const mode = puzzle.mode ?? 'clubs';

  // The whole sequence is one set of timers rather than chained callbacks, so
  // unmounting mid-reveal cannot leave a stray one running.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    at(560, () => setStage('resolving'));

    // Every span goes on, including the ones after a break. The first draft
    // stopped the run dead at the first failure, which read well but lied:
    // the line under it says "2 of 4 links held" and the player could only
    // see one verdict. Watching a later link survive a broken chain is also
    // the part that stings usefully — you were one name away.
    for (let i = 0; i < result.links.length; i++) at(700 + i * BEAT, () => setResolved(i));

    const after = 700 + result.links.length * BEAT;
    at(after + 420, () => setStage('verdict'));
    at(after + 1000, () => setStage('score'));
    at(after + 2200, () => setStage('detail'));

    return () => timers.forEach(clearTimeout);
  }, [result]);

  const showScore = stage === 'score' || stage === 'detail';
  const detail = stage === 'detail';

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
    const held = [links[i - 1], links[i]].filter((l) => l?.made);
    if (held.length === 0) return 'var(--accent)';
    const [a, b] = held.map((l) => clubColour(l!.required ?? l!.clubs[0]));
    return b === undefined ? a! : splitRing(a!, b, 'var(--card-a)');
  }, [fill, puzzle.slots, links, pool]);

  const depthFor = useCallback(
    (i: number) => result.slots.find((s) => s.index === i)?.depth ?? null,
    [result.slots],
  );

  // Where the string is tied. Measured from the mounts rather than computed
  // from the layout: the row is flexible, the cards carry a small rotation,
  // and a hard-coded pitch would be wrong at every width but one.
  const board = useRef<HTMLDivElement>(null);
  const plates = useRef<(HTMLDivElement | null)[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);

  const setPlate = useCallback((i: number, el: HTMLDivElement | null) => {
    plates.current[i] = el;
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const box = board.current?.getBoundingClientRect();
      if (!box) return;
      const head = pinHead();
      const next = plates.current.slice(0, fill.length).map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        // Tied to the pin's HEAD, not to the top of the card. The offset comes
        // from the pin itself so that moving the pin moves the string with it
        // — the first version hard-coded the card's top edge and every string
        // came adrift the moment the pin was driven in deeper.
        return {
          x: r.left + r.width / 2 - box.left + head.cx,
          y: r.top - box.top + head.cy,
        };
      });
      setAnchors((prev) =>
        prev.length === next.length && prev.every((p, i) => Math.abs(p.x - next[i]!.x) < 0.5 && Math.abs(p.y - next[i]!.y) < 0.5)
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (board.current) ro.observe(board.current);
    window.addEventListener('resize', measure);
    // Portraits arrive after first paint and change nothing about the row's
    // height — but fonts do, so one late pass covers the reflow.
    const late = setTimeout(measure, 400);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(late); };
  }, [fill.length]);

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
          className="paper"
          style={{ position: 'relative', padding: '40px 30px 26px', animation: 'sheet-rise 520ms cubic-bezier(0.2,0.9,0.3,1) both' }}
        >
          <SheetPins />

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

          {/* The chain, with the string running over it. The string layer is
              absolutely positioned inside this box, so this is the coordinate
              space every anchor is measured in. */}
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
              depthFor={(i) => (detail ? depthFor(i) : null)}
              revealDelayFor={(i) => i * 140}
              plateRef={setPlate}
              pinsDriving
              pinBeat={130}
              stringed
            />
            {anchors.length === fill.length ? (
              <RedString
                anchors={anchors}
                held={result.links}
                resolved={resolved}
                beat={BEAT}
              />
            ) : null}
          </div>

          {/* ── THE VERDICT ─────────────────────────────────────────────
              Same geometry as the brief band on the live sheet: a statement
              on the left, a block on the right. The block is gold now. */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'stretch', border: '2.5px solid var(--ink)', minHeight: 86 }}>
            <div style={{ flexGrow: 1, padding: '14px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
              {stage === 'arming' || stage === 'resolving' ? (
                <div className="narrow" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.3em', color: 'var(--muted)' }}>
                  RUNNING THE STRING&hellip;
                </div>
              ) : (
                <div style={{ animation: 'verdict-in 420ms cubic-bezier(0.2,1.4,0.4,1) both' }}>
                  <div
                    className="slab misreg"
                    style={{ fontSize: 34, lineHeight: 1, color: result.perfect ? 'var(--green)' : 'var(--accent)' }}
                  >
                    {result.perfect ? 'CHAIN HELD' : 'CHAIN BROKE'}
                  </div>
                  <div className="read" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--soft)', marginTop: 5 }}>
                    {result.perfect
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
              {showScore ? <ScoreReveal value={result.score} /> : (
                <div className="slab" style={{ fontSize: 34, color: 'rgba(26,20,16,0.2)' }}>&mdash;</div>
              )}
            </div>
          </div>

          {/* ── WHAT THE BOARD WAS ──────────────────────────────────────
              The artboard's foil band. It states the size of the answer
              space, which is a fact about the answer and therefore could
              only ever appear here. */}
          {detail && result.pairs !== null ? (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'stretch', border: '2.5px solid var(--ink)', animation: 'foil-in 460ms ease-out 120ms both' }}>
              <div style={{ flexGrow: 1, padding: '13px 20px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <div className="narrow" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {result.slots.map((s, i) => `${s.fieldSize} fit the ${['first', 'second', 'third'][i] ?? `${i + 1}th`}`).join(' · ')}
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
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, borderBottom: '2px solid rgba(26,20,16,0.42)', paddingBottom: 7, flexWrap: 'wrap' }}>
              <div className="slab misreg" style={{ fontSize: 20 }}>
                <span className="lean">WHO WOULD HAVE WORKED</span>
              </div>
              <div className="read" style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--soft)' }}>
                {result.entry !== null
                  ? <>The easiest pair here is worth {result.entry} &mdash; that is the grade.</>
                  : <>Split down the middle: the two clubs that made him fit.</>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 6 }}>
              {result.pinboard.map((answer, i) => (
                <Pinned key={answer.id} answer={answer} images={images} clubs={clubs} order={i} />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {result.slots.map((s) => (
                <Breakdown key={s.index} slot={s} pool={pool} />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <div className="read" style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--soft)' }}>
                Split down the middle: the two clubs that made him fit.
              </div>
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

/** What one slot cost, in words. */
function Breakdown({ slot, pool }: { slot: SlotOutcome; pool: ReadonlyMap<string, Player> }) {
  const mine = slot.playerId ? pool.get(slot.playerId) : undefined;
  const beatMe = slot.best && slot.depth && slot.best.score > slot.depth.score;
  const nailed = slot.held && slot.best?.id === slot.playerId;

  return (
    <div
      style={{
        border: '1.5px solid rgba(26,20,16,0.24)', padding: '13px 16px',
        background: 'var(--panel-2)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 190, flex: 1 }}>
        <div className="narrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--muted)' }}>
          YOU PLAYED
        </div>
        <div className="read" style={{ fontWeight: 500, fontSize: 16, color: slot.held ? 'var(--text)' : 'var(--accent)' }}>
          {mine?.name ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
          {!slot.held
            ? 'did not link'
            : slot.depth?.rank
              ? `${slot.depth.rank} of ${slot.depth.fieldSize} for obscurity · scored ${slot.depth.score}`
              : `scored ${slot.depth?.score ?? 0}`}
        </div>
      </div>

      {/* The point of the whole screen: what was sitting there. When the
          player already found it, saying so outright beats printing their own
          name back at them under a heading that reads like a correction.

          It does NOT claim they went deepest, and the wording is careful for
          a reason: `best` is the deepest answer above a fame floor, while the
          gauge on the card ranks against the untouched field. On chain 008
          that put "nobody went deeper" directly beside "4th most obscure of
          8" — both true of different sets, and flatly contradictory to read.
          The heading says what happened; the rank is the gauge's job. */}
      <div style={{ minWidth: 190, flex: 1 }}>
        <div className="narrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--muted)' }}>
          {nailed ? 'THE ANSWER WE HAD' : 'DEEPEST ANSWER'}
        </div>
        <div className="read" style={{ fontWeight: 500, fontSize: 16, color: nailed ? 'var(--green)' : beatMe ? 'var(--gold)' : 'var(--green)' }}>
          {nailed ? 'You found it yourself' : slot.best?.name ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
          {`${slot.fieldSize} would have fitted · worth ${slot.best?.score ?? 0}`}
        </div>
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
  answer, images, clubs, order,
}: {
  answer: PinnedAnswer;
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
  order: number;
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
      {answer.mine || deepCut ? (
        <div
          className="narrow"
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
            background: answer.mine ? 'var(--green)' : 'var(--ink)', color: '#f7f2e6', padding: '3px 8px',
          }}
        >
          {answer.mine ? 'You found it' : 'Deep cut'}
        </div>
      ) : null}
    </div>
  );
}
