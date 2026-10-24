'use client';
import { useEffect, useRef, useState } from 'react';
import Slab from '../../../components/Slab';
import CardTilt from '../../../components/CardTilt';
import { GRADES, GRADE_WORD, type Grade } from '../../../src/lib/chain/grade';
import type { DemoClub, DemoSticker } from '../../../src/lib/demo';
import type { StepCard, StepClub, StepDay, Verdict } from '../lib/types';
import { SHOW, showAt } from '../lib/show';
import Slam from './Slam';
import { Summary } from './Step';

type View = 'reveal' | 'end' | 'open';
type Pick = Grade | 'miss';

/**
 * Dev only (/step/preview): every card motion on demand, nothing to play.
 * The reveal per grade (and a miss) with Replay and a scrubber through the
 * show, the end of a run, and an opened card to tilt. Real players and
 * crests from the server, the real components, so what shows here is what
 * ships.
 */
export default function MotionPreview({ players, club }: { players: DemoSticker[]; club: DemoClub }) {
  const [view, setView] = useState<View>('reveal');
  const [pick, setPick] = useState<Pick>('elite');
  const [take, setTake] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const stepClub: StepClub = { id: club.id, club: club.club, colour: club.colour };
  const card = (p: DemoSticker): StepCard => ({ id: p.id, name: p.name, image: p.image ?? null, clubs: [stepClub, stepClub] });
  const verdict = (g: Pick, i: number): Verdict => ({
    held: g !== 'miss', grade: g === 'miss' ? null : g, pick: card(players[i % players.length]!), obvious: null, elite: null,
  });
  const ground = (p: DemoSticker) => ({ a: p.ground.a, b: p.ground.b, liveA: true, liveB: true });

  // Scrubbing poses the show at u on a reveal that has already landed (Slam play=false).
  useEffect(() => {
    const root = stage.current?.querySelector<HTMLElement>('.step-slam');
    if (!root || scrub === null || pick === 'miss') return;
    const f = showAt(SHOW[pick], scrub);
    root.style.setProperty('--push', String(f.push));
    root.style.setProperty('--rx', `${f.rx}deg`);
    root.style.setProperty('--ry', `${f.ry}deg`);
    root.style.setProperty('--lx', `${f.lx}%`);
    root.style.setProperty('--ly', `${f.ly}%`);
    root.style.setProperty('--lit', String(f.lit));
    root.style.setProperty('--pool', String(f.pool));
  }, [scrub, pick, take]);

  const replay = () => { setScrub(null); setTake((t) => t + 1); };
  const choose = (g: Pick) => { setPick(g); replay(); };

  // A run of four: the chosen grade first, then down the grades, so the deepest is the first card.
  const run: Verdict[] = [0, 1, 2, 3].map((i) => {
    const g = pick === 'miss' ? (i === 1 ? 'miss' : GRADES[3 - i]!) : (GRADES[Math.max(0, GRADES.indexOf(pick) - i)]!);
    return verdict(g, i);
  });
  const day: StepDay = {
    date: '2026-01-01', day: 0,
    steps: run.map((_, i) => ({ player: { ...card(players[i]!), ground: players[i]!.ground.a }, club: stepClub, playerFirst: true })),
  };

  return (
    <main className="mprev">
      <aside className="mprev__controls">
        <p className="hero__eyebrow">Card motion</p>
        <div className="mprev__group" role="group" aria-label="What to show">
          {(['reveal', 'end', 'open'] as View[]).map((v) => (
            <button key={v} type="button" className={`mprev__btn ${view === v ? 'is-on' : ''}`} aria-pressed={view === v} onClick={() => { setView(v); replay(); }}>
              {v === 'reveal' ? 'Getting a card' : v === 'end' ? 'End of run' : 'Opened card'}
            </button>
          ))}
        </div>
        <div className="mprev__group" role="group" aria-label="Grade">
          {[...GRADES, ...(view === 'reveal' ? (['miss'] as const) : [])].map((g) => (
            <button key={g} type="button" className={`mprev__btn ${pick === g ? 'is-on' : ''}`} aria-pressed={pick === g} onClick={() => choose(g)}>
              {g === 'miss' ? 'Miss' : GRADE_WORD[g]}
            </button>
          ))}
        </div>
        {view !== 'open' ? <button type="button" className="lobby-play" onClick={replay}>Replay</button> : null}
        {view === 'reveal' && pick !== 'miss' ? (
          <label className="mprev__scrub">
            <span>Scrub the show {scrub === null ? '' : `· ${Math.round(scrub * SHOW[pick].ms)} of ${SHOW[pick].ms} ms`}</span>
            <input type="range" min={0} max={1} step={0.01} value={scrub ?? 0} onChange={(e) => setScrub(Number(e.target.value))} />
          </label>
        ) : null}
        {view === 'open' ? <p className="mprev__note">Move over the card, or drag it on a phone.</p> : null}
      </aside>

      <section className="mprev__stage" ref={stage}>
        {view === 'reveal' ? (
          <div className="step-verdict" key={`${pick}-${take}-${scrub === null}`}>
            <span className="step-verdict__kicker">Ball knowledge</span>
            <Slam verdict={verdict(pick, GRADES.indexOf(pick as Grade) + 1)} ground={ground(players[0]!)} news="new" play={scrub === null} onDone={() => {}} />
          </div>
        ) : view === 'end' ? (
          <Summary key={`${pick}-${take}`} day={day} run={run} />
        ) : (
          <CardTilt key={pick}>
            <Slab grade={pick === 'miss' ? 'elite' : pick} player={players[0]!} image={players[0]!.image} ground={ground(players[0]!)} size="lg" />
          </CardTilt>
        )}
      </section>
    </main>
  );
}
