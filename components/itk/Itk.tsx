'use client';
import { useState } from 'react';
import { StickerFace, solid } from '../Sticker';
import { shortClubName } from '../ClubBadge';
import Trail, { Loop } from './Trail';
import { CopyFeedback, FeedbackStrip, useFeedback } from './Feedback';
import type { ItkSet, Verdict } from '../../src/server/itk';
import { PICKS, itkShareLine, roundMark, tierOf } from '../../src/lib/itk/score';
import type { PlateMark } from '../../src/lib/chain/share';

/**
 * ITK: five careers, one move in each that never happened. Circle it.
 *
 * Prototype over the example sets in content/itk/examples.json. Picks are
 * judged by /api/itk/pick; the page never knows where the fake is until the
 * round is over.
 */
export interface Pick { index: number; fake: boolean }

const VERDICT: Record<PlateMark, string> = { held: 'Clocked it', hinted: 'Got there', missed: 'Had you' };
/** The beat between circling a club and hearing about it. */
const BEAT = 520;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Itk({ sets }: { sets: ItkSet[] }) {
  const [setIdx, setSetIdx] = useState(0);
  const set = sets[setIdx]!;
  const n = set.rounds.length;
  const blank = () => set.rounds.map(() => [] as Pick[]);

  const [round, setRound] = useState(0);
  const [view, setView] = useState(0);
  const [picks, setPicks] = useState<Pick[][]>(blank);
  const [fakes, setFakes] = useState<(number | null)[]>(() => set.rounds.map(() => null));
  const [reals, setReals] = useState<({ clubId: string; name: string } | null)[]>(() => set.rounds.map(() => null));
  const [pending, setPending] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const fb = useFeedback();

  const marks = picks.map((p) => roundMark(p.map((x) => x.fake)));
  const r = set.rounds[view]!;
  const mark = marks[view];
  const viewPicks = picks[view]!;

  function reset(idx: number) {
    const s = sets[idx]!;
    setSetIdx(idx);
    setRound(0);
    setView(0);
    setPicks(s.rounds.map(() => []));
    setFakes(s.rounds.map(() => null));
    setReals(s.rounds.map(() => null));
    setPending(null);
    setFinished(false);
  }

  async function pick(index: number) {
    if (pending !== null || mark || viewPicks.some((p) => p.index === index)) return;
    setPending(index);
    const last = viewPicks.length + 1 >= PICKS;
    const res = await Promise.all([
      fetch('/api/itk/pick', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ set: set.id, round: view, index, last }),
      }).then((x) => (x.ok ? (x.json() as Promise<Verdict>) : null)),
      sleep(BEAT),
    ]).then(([v]) => v, () => null);
    // A pick that was never judged is not spent: let go of the card and let them try again.
    if (!res) { setPending(null); return; }
    setPicks((all) => all.map((p, i) => (i === view ? [...p, { index, fake: res.fake }] : p)));
    const after = [...viewPicks, { index, fake: res.fake }];
    const result = roundMark(after.map((x) => x.fake));
    if (result && res.fakeIndex !== null) {
      fb.update(set.id, view, r.player.name, {
        result,
        picked: after.map((x) => r.stops[x.index]!.name),
        fake: r.stops[res.fakeIndex]!.name,
        real: res.real?.name,
      });
    }
    if (res.fakeIndex !== null) {
      setFakes((all) => all.map((f, i) => (i === view ? res.fakeIndex : f)));
      setReals((all) => all.map((x, i) => (i === view ? res.real : x)));
    }
    setPending(null);
  }

  function next() {
    if (view < round) { setView(round); return; }
    if (round + 1 < n) { setRound(round + 1); setView(round + 1); } else setFinished(true);
  }

  const done = marks.every(Boolean);

  return (
    <div className="app itk">
      <header className="masthead">
        <a className="masthead__brand display" href="/itk">
          <ItkMark />
          ITK
        </a>
        <div className="masthead__meta">
          <span className="pill">Prototype</span>
          <nav className="masthead__nav" aria-label="Album">
            <a className="masthead__button" href="/">Chain</a>
          </nav>
        </div>
      </header>

      <div className="itk-proto" role="group" aria-label="Example set">
        <span className="itk-proto__label">Example set</span>
        {sets.map((s, i) => (
          <button key={s.id} type="button" className="itk-proto__set" aria-pressed={i === setIdx} onClick={() => reset(i)}>
            <b>{s.id}</b> {s.picker}
          </button>
        ))}
        <CopyFeedback store={fb.store} />
      </div>

      <main className="itk__main">
        {finished && done ? (
          <Summary set={set} marks={marks as PlateMark[]} onReview={(i) => { setFinished(false); setView(i); }} onAgain={() => reset(setIdx)} />
        ) : (
          <>
            <div className="itk__bar">
              <ol className="itk-pips" aria-label="Careers">
                {set.rounds.map((_, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className={`itk-pip ${marks[i] ? `itk-pip--${marks[i]}` : ''} ${i === view ? 'is-current' : ''}`}
                      disabled={i > round}
                      onClick={() => setView(i)}
                      aria-label={`Career ${i + 1}${marks[i] ? `, ${VERDICT[marks[i]!].toLowerCase()}` : ''}`}
                      aria-current={i === view ? 'step' : undefined}
                    />
                  </li>
                ))}
              </ol>
              <span className="itk-picks" aria-label={`${PICKS - viewPicks.length} of ${PICKS} picks left`}>
                {Array.from({ length: PICKS }, (_, i) => (
                  <Loop key={i} className={`itk-picks__loop ${i < viewPicks.length ? 'is-used' : ''}`} />
                ))}
              </span>
            </div>

            <section className="itk-stage" key={`${set.id}-${view}`}>
              <div className={`itk-stage__tab itk-stage__tab--${view < 2 ? 'easy' : view < 4 ? 'medium' : 'hard'} display`}>
                Career {view + 1}
              </div>
              <div className={`itk-stage__who ${mark ? `is-${mark}` : ''}`}>
                <StickerFace player={r.player} image={r.image ?? undefined} ground={solid(r.ground)} className="sticker--still" />
              </div>
              <Trail
                stops={r.stops}
                picks={viewPicks}
                fakeIndex={fakes[view] ?? null}
                real={reals[view] ?? null}
                pending={pending}
                locked={Boolean(mark)}
                onPick={pick}
              />
            </section>

            <div className="itk-status" aria-live="polite">
              {mark ? (
                <>
                  <span className={`itk-status__chip itk-status__chip--${mark}`} aria-hidden />
                  <span className="itk-status__verdict display">{VERDICT[mark]}</span>
                  {mark === 'missed' && fakes[view] !== null ? (
                    <span className="itk-status__note">
                      It was {shortClubName(r.stops[fakes[view]!]!.name)}{reals[view] ? `, really ${shortClubName(reals[view]!.name)}` : ', a move that never happened'}
                    </span>
                  ) : null}
                  <button type="button" className="seal itk-status__next" onClick={next}>
                    {view < round ? 'Back' : round + 1 < n ? 'Next' : 'Your tier'}
                  </button>
                </>
              ) : (
                <span className="itk-status__hint">
                  {viewPicks.length === 0 ? 'One of these moves never happened.' : 'Real move. One pick left.'}
                </span>
              )}
            </div>
            <FeedbackStrip
              key={`fb-${set.id}-${view}`}
              value={fb.get(set.id, view)}
              revealed={Boolean(mark)}
              onChange={(patch) => fb.update(set.id, view, r.player.name, patch)}
            />
          </>
        )}
      </main>
    </div>
  );
}

/** The day's result: the tier as a stamp, the five careers, the share line. */
function Summary({ set, marks, onReview, onAgain }: {
  set: ItkSet;
  marks: PlateMark[];
  onReview: (i: number) => void;
  onAgain: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const tier = tierOf(marks);
  async function share() {
    await navigator.clipboard?.writeText(itkShareLine(1, marks)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <section className="itk-end">
      <p className="itk-end__eyebrow">ITK #1</p>
      <div className={`itk-end__tier display ${tier === 'Tier 1' ? 'is-top' : ''}`}>{tier}</div>
      <ol className="itk-end__row">
        {set.rounds.map((r, i) => (
          <li key={i}>
            <button type="button" className="itk-end__card" onClick={() => onReview(i)} aria-label={`Review career ${i + 1}`}>
              <StickerFace player={r.player} image={r.image ?? undefined} ground={solid(r.ground)} />
              <span className={`itk-end__mark itk-pip itk-pip--${marks[i]}`} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <div className="itk-end__actions">
        <button type="button" className="seal" onClick={share}>{copied ? 'Copied' : 'Share'}</button>
        <button type="button" className="itk-ghost" onClick={onAgain}>Play again</button>
      </div>
    </section>
  );
}

/** The mark: a marker loop round a sticker. */
function ItkMark() {
  return (
    <svg className="masthead__mark" viewBox="0 0 26 32" aria-hidden>
      <rect x="6.5" y="8.5" width="13" height="16" rx="1" fill="currentColor" />
      <path
        d="M5 9.5 C9 3.5 21 3 23.6 10.5 C26 17.5 23 28.5 13.4 29.2 C4.5 29.8 1.2 22 2.2 15.4 C2.8 11.4 6.5 7.2 14.5 6.6"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      />
    </svg>
  );
}
