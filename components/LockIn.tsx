'use client';
import { useEffect, useState } from 'react';
import { useCountUp } from './DepthGauge';
import { shareText } from '../src/lib/chain/result';
import type { ChainResult, SlotOutcome } from '../src/lib/chain/result';
import type { Player } from '../src/lib/chemistry/types';
import { clubColour, splitRing } from '../src/lib/club-colours';
import { shortClubName } from './ClubBadge';
import type { ClubView } from '../src/lib/clubs';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * The lock-in.
 *
 * This screen is the whole game. Everything before it is typing names into a
 * box; this is the only moment the player finds out whether they were right,
 * and the only moment they learn what they walked past. So it takes the screen
 * completely rather than updating a number in a header.
 *
 * The chain resolves one link at a time, left to right, like a current running
 * down the line, each joint holding or failing in turn. Then the score lands,
 * and only then does the board admit what the best available answers were.
 *
 * That order matters. Showing the misses before the verdict would turn relief
 * into arithmetic; showing them at all is what makes the next chain worth
 * playing, because the thing a player remembers is not the 62 they scored, it
 * is the name they had never heard of that was sitting there the whole time.
 */

/** Where the reveal has got to. Each step is one beat of the sequence. */
type Stage = 'arming' | 'resolving' | 'verdict' | 'score' | 'detail';

const BEAT = 420;

export default function LockIn({
  result, chainId, pool, images, clubs, onDismiss,
}: {
  result: ChainResult;
  chainId: string;
  pool: ReadonlyMap<string, Player>;
  /** Player id to a ready picture. See src/lib/portraits.ts. */
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
  onDismiss: () => void;
}) {
  const [stage, setStage] = useState<Stage>('arming');
  const [resolved, setResolved] = useState(-1);

  // The whole sequence is one set of timers rather than chained callbacks, so
  // that unmounting mid-reveal cannot leave a stray one running.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    at(220, () => setStage('resolving'));

    // Every link resolves, including the ones after a break. The first draft
    // stopped the run dead at the first failure, which read well but lied: the
    // line under it says "2 of 4 links held" and the player could only see one
    // verdict. Watching a later link survive a broken chain is also the part
    // that stings usefully — you were one name away.
    for (let i = 0; i < result.links.length; i++) at(360 + i * BEAT, () => setResolved(i));

    const after = 360 + result.links.length * BEAT;
    at(after + 160, () => setStage('verdict'));
    at(after + 780, () => setStage('score'));
    at(after + 1900, () => setStage('detail'));

    return () => timers.forEach(clearTimeout);
  }, [result]);

  const showScore = stage === 'score' || stage === 'detail';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chain result"
      className="sheet"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
        animation: 'lockin-in 260ms ease-out both',
      }}
    >
      <div
        className="paper"
        style={{
          width: '100%', maxWidth: 720, padding: '34px 34px 30px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
        }}
      >

        {/* The run. One segment per link, lit in order. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          {result.links.map((made, i) => {
            const lit = i <= resolved;
            return (
              <div
                key={i}
                style={{
                  flex: 1, height: 10, borderRadius: 0,
                  background: !lit
                    ? 'rgba(26,20,16,0.14)'
                    : made ? 'var(--green)' : 'var(--accent)',
                  boxShadow: 'none',
                  transform: lit ? 'scaleY(1)' : 'scaleY(0.55)',
                  transition: 'background 120ms linear, box-shadow 200ms ease, transform 200ms ease',
                }}
              />
            );
          })}
        </div>

        {stage !== 'arming' && stage !== 'resolving' ? (
          <div style={{ textAlign: 'center', animation: 'verdict-in 420ms cubic-bezier(0.2,1.4,0.4,1) both' }}>
            <div
              className="slab misreg"
              style={{
                fontSize: 46, lineHeight: 1,
                color: result.perfect ? 'var(--green)' : 'var(--accent)',
              }}
            >
              {result.perfect ? 'CHAIN HELD' : 'CHAIN BROKE'}
            </div>
            <div className="read" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--soft)', marginTop: 8 }}>
              {result.perfect
                ? 'Every link a real one.'
                : `${result.made} of ${result.total} links held. A broken link scores nothing.`}
            </div>
          </div>
        ) : (
          <div className="narrow" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.3em', color: 'var(--muted)' }}>
            CHECKING THE CHAIN
          </div>
        )}

        {showScore ? <ScoreReveal value={result.score} /> : null}

        {stage === 'detail' ? (
          <div style={{ width: '100%', animation: 'verdict-in 420ms ease-out both', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid rgba(26,20,16,0.42)', paddingBottom: 7 }}>
              <div className="slab misreg" style={{ fontSize: 19 }}>
                <span className="lean">WHO WOULD HAVE WORKED</span>
              </div>
              <div className="read" style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--soft)' }}>
                Split down the middle: the two clubs that made him fit.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
              {result.slots.map((s) => (
                <Pinned key={s.index} slot={s} pool={pool} images={images} clubs={clubs} />
              ))}
            </div>

            {result.slots.map((s) => {
              const mine = s.playerId ? pool.get(s.playerId) : undefined;
              const beatMe = s.best && s.depth && s.best.score > s.depth.score;
              const nailed = s.held && s.best?.id === s.playerId;
              return (
                <div
                  key={s.index}
                  style={{
                    border: '1.5px solid rgba(26,20,16,0.24)', borderRadius: 0, padding: '13px 16px',
                    background: 'var(--panel-2)',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 190, flex: 1 }}>
                    <div className="cond" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)' }}>
                      YOU PLAYED
                    </div>
                    <div className="read" style={{ fontWeight: 500, fontSize: 16, color: s.held ? 'var(--text)' : 'var(--accent)' }}>
                      {mine?.name ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
                      {!s.held
                        ? 'did not link'
                        : s.depth?.rank
                          ? `${s.depth.rank} of ${s.depth.fieldSize} for obscurity · scored ${s.depth.score}`
                          : `scored ${s.depth?.score ?? 0}`}
                    </div>
                  </div>

                  {/* The point of the whole screen: what was sitting there.
                      When the player already found it, saying so outright beats
                      printing their own name back at them under a heading that
                      reads like a correction. */}
                  <div style={{ minWidth: 190, flex: 1 }}>
                    <div className="cond" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)' }}>
                      {nailed ? 'NOBODY WENT DEEPER' : 'DEEPEST ANSWER'}
                    </div>
                    <div className="read" style={{ fontWeight: 500, fontSize: 16, color: nailed ? 'var(--green)' : beatMe ? 'var(--gold)' : 'var(--green)' }}>
                      {nailed ? 'You found it' : s.best?.name ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
                      {nailed
                        ? `the most obscure of ${s.fieldSize} who fitted`
                        : `${s.fieldSize} would have fitted · worth ${s.best?.score ?? 0}`}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <CopyButton text={shareText(result, chainId)} />
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
                Back to the board
              </button>
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
        style={{
          background: 'linear-gradient(148deg, #e6cb8c, #a8791f 44%, #dcb968 70%, #85601a)',
          border: '2.5px solid var(--ink)', padding: '14px 46px 12px',
        }}
      >
        <div
          className="slab"
          style={{
            fontSize: 74, lineHeight: 0.92, color: '#fffdf7',
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
  slot, pool, images, clubs,
}: {
  slot: SlotOutcome;
  pool: ReadonlyMap<string, Player>;
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
}) {
  const best = slot.best;
  if (!best) return null;
  const nailed = slot.held && best.id === slot.playerId;
  const photo = images[best.id];
  const [a, b] = best.clubs;
  const ring = a === undefined
    ? 'var(--ink)'
    : splitRing(clubColour(a), clubColour(b ?? a), 'var(--card-a)');

  return (
    <div style={{ width: 132, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
      <svg width="15" height="15" viewBox="0 0 15 15" style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }} aria-hidden>
        <circle cx="7.5" cy="7.5" r="6.5" fill="#a8791f" />
        <circle cx="5.4" cy="5.4" r="2.1" fill="#e6cb8c" />
      </svg>
      <div className="mount" style={{ padding: '6px 6px 0' }}>
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
            <div style={{ width: '100%', height: '100%', background: '#e6ded0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,16,0.3)" strokeWidth="1.4">
                <circle cx="12" cy="8" r="3.6" />
                <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
              </svg>
            </div>
          )}
        </div>
        <div className="narrow" style={{ width: 120, padding: '5px 0 6px', fontSize: 12, fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {best.name.toUpperCase()}
        </div>
      </div>
      <div className="read" style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.35, color: 'var(--soft)' }}>
        {best.clubs.length
          ? best.clubs.map((c) => shortClubName(clubs[c]?.name ?? c)).join(' and ')
          : 'the deepest that fitted'}
      </div>
      <div
        className="narrow"
        style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: nailed ? 'var(--green)' : 'var(--ink)', color: '#f7f2e6', padding: '3px 8px',
        }}
      >
        {nailed ? 'You found it' : `Deepest of ${slot.fieldSize}`}
      </div>
    </div>
  );
}
