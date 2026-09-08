'use client';
import { useEffect, useState } from 'react';
import { useCountUp } from './DepthGauge';
import { shareText } from '../src/lib/chain/result';
import type { ChainResult } from '../src/lib/chain/result';
import type { Player } from '../src/lib/chemistry/types';

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
  result, chainId, pool, onDismiss,
}: {
  result: ChainResult;
  chainId: string;
  pool: ReadonlyMap<string, Player>;
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
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(4,6,11,0.975)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
        animation: 'lockin-in 260ms ease-out both',
      }}
    >
      <div style={{ width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>

        {/* The run. One segment per link, lit in order. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          {result.links.map((made, i) => {
            const lit = i <= resolved;
            return (
              <div
                key={i}
                style={{
                  flex: 1, height: 12, borderRadius: 6,
                  background: !lit
                    ? 'rgba(255,255,255,0.07)'
                    : made ? 'var(--green)' : 'var(--link-red)',
                  boxShadow: lit
                    ? made ? '0 0 22px rgba(94,224,138,0.85)' : '0 0 22px rgba(192,57,43,0.8)'
                    : 'none',
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
              className="cond"
              style={{
                fontWeight: 700, fontSize: 52, lineHeight: 1, letterSpacing: '0.02em',
                color: result.perfect ? 'var(--green)' : 'var(--link-red)',
                textShadow: result.perfect
                  ? '0 0 34px rgba(94,224,138,0.55)'
                  : '0 0 34px rgba(192,57,43,0.45)',
              }}
            >
              {result.perfect ? 'CHAIN HELD' : 'CHAIN BROKE'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 8 }}>
              {result.perfect
                ? 'Every link a real one.'
                : `${result.made} of ${result.total} links held. A broken link scores nothing.`}
            </div>
          </div>
        ) : (
          <div className="cond" style={{ fontSize: 13, letterSpacing: '0.3em', color: 'var(--muted)' }}>
            CHECKING THE CHAIN
          </div>
        )}

        {showScore ? <ScoreReveal value={result.score} /> : null}

        {stage === 'detail' ? (
          <div style={{ width: '100%', animation: 'verdict-in 420ms ease-out both', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.slots.map((s) => {
              const mine = s.playerId ? pool.get(s.playerId) : undefined;
              const beatMe = s.best && s.depth && s.best.score > s.depth.score;
              const nailed = s.held && s.best?.id === s.playerId;
              return (
                <div
                  key={s.index}
                  style={{
                    border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 190, flex: 1 }}>
                    <div className="cond" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)' }}>
                      YOU PLAYED
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: s.held ? 'var(--text)' : 'var(--link-red)' }}>
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
                    <div style={{ fontWeight: 600, fontSize: 15, color: nailed ? 'var(--green)' : beatMe ? 'var(--gold)' : 'var(--green)' }}>
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
                style={{
                  background: 'transparent', color: 'var(--soft)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '12px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
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
        className="cond"
        style={{
          fontWeight: 700, fontSize: 96, lineHeight: 0.9, color: 'var(--gold)',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 40px rgba(240,180,41,0.45)',
        }}
      >
        {score}
      </div>
      <div className="cond" style={{ fontSize: 12, letterSpacing: '0.28em', color: 'var(--muted)', marginTop: 10 }}>
        OBSCURITY · OUT OF 100
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
      style={{
        background: 'var(--green)', color: 'var(--bg)', border: 'none', borderRadius: 6,
        padding: '12px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed — select it yourself' : 'Copy result'}
    </button>
  );
}
