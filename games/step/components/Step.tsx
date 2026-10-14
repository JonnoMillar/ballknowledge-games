'use client';
import { useEffect, useMemo, useState } from 'react';
import Back from '../../../components/Back';
import Sticker, { EmptySticker, Figure, StickerFace, neutral, solid, type Ground } from '../../../components/Sticker';
import SearchSheet from '../../../components/SearchSheet';
import Slab, { GradeChip } from '../../../components/Slab';
import ClubBadge, { shortClubName } from '../../../components/ClubBadge';
import { buildIndex, type SearchIndex } from '../../../src/lib/search/index';
import { decodeNames, type NameEntry, type NameRow } from '../../../src/lib/chain/client';
import { recordCards, type CardNews } from '../../../src/lib/collection';
import { localDate } from '../../../src/lib/daily';
import { plateName } from '../../../src/lib/short-name';
import { NAME, STEPS, runGrade, shareLine } from '../lib/rules';
import Slam from './Slam';
import { loadRun, saveRun, type Run } from '../lib/progress';
import type { StepCard, StepClub, StepDay, StepGiven, Verdict } from '../lib/types';

/**
 * The step run: one gap at a time. PLAYER — ? — CLUB, lock it in, it is
 * graded, the board slides on to CLUB — ? — NEW PLAYER, four times.
 *
 * Today is the player's own date; `?date=` opens a past day from the
 * archive. Every pick is judged by /api/step/pick. The verdict opens like a
 * pack (Slam), then says which club linked the pick and the obvious answer;
 * the schedule keeps that answer out of the day's other steps. The deepest
 * answers wait for the end.
 */
export default function Step() {
  const [day, setDay] = useState<StepDay | null | undefined>(undefined);
  const [archived, setArchived] = useState(false);
  useEffect(() => {
    const today = localDate();
    const q = new URLSearchParams(location.search).get('date');
    const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q < today ? q : today;
    setArchived(date !== today);
    fetch(`/api/step/day?date=${date}`)
      .then((r) => (r.ok ? (r.json() as Promise<StepDay>) : null))
      .then(setDay, () => setDay(null));
  }, []);

  return (
    <div className="app step">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/step">
          <StepMark />
          {NAME}
        </a>
        <div className="masthead__meta">
          {day ? <span>#{day.day}</span> : null}
          <nav className="masthead__nav" aria-label="Site">
            <a className="masthead__button" href="/step/archive">Archive</a>
            <a className="masthead__button" href="/collection">Cards</a>
          </nav>
        </div>
      </header>
      <main className="step__main">
        {day === undefined ? null : day === null ? (
          <p className="step__none">{archived ? 'No run that day.' : 'No run today. Back tomorrow.'}</p>
        ) : (
          <Game key={day.date} day={day} />
        )}
      </main>
    </div>
  );
}

function useAlbum(): SearchIndex<NameEntry> | null {
  const [index, setIndex] = useState<SearchIndex<NameEntry> | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/names')
      .then((r) => r.json() as Promise<{ players: NameRow[] }>)
      .then((d) => { if (live) setIndex(buildIndex(decodeNames(d.players))); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return index;
}

function Game({ day }: { day: StepDay }) {
  const [run, setRun] = useState<Run>(() => loadRun(day.date, STEPS));
  const open = run.findIndex((v) => v === null);
  const done = open === -1;
  // The step on screen: the first open one, or the last one locked until Next is pressed.
  const [view, setView] = useState(done ? STEPS - 1 : open);
  const [finished, setFinished] = useState(done);
  const [chosen, setChosen] = useState<NameEntry | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState(false);
  const [news, setNews] = useState<CardNews>(null);
  // A verdict just judged plays its reveal; until it ends the strip and pips keep the result back.
  const [revealing, setRevealing] = useState(false);
  const index = useAlbum();

  const step = day.steps[view]!;
  const verdict = run[view] ?? null;
  const taken = useMemo(() => new Set([
    ...day.steps.map((s) => s.player.id),
    ...run.flatMap((v) => (v ? [v.pick.id] : [])),
  ]), [day, run]);

  async function lock() {
    if (!chosen || pending || verdict) return;
    setPending(true);
    const res = await fetch('/api/step/pick', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: day.date, step: view, pick: chosen.id, earlier: run.flatMap((v) => (v ? [v.pick.id] : [])) }),
    }).then((r) => (r.ok ? (r.json() as Promise<Verdict>) : null), () => null);
    setPending(false);
    // A pick that was never judged is not spent.
    if (!res) return;
    const next = run.map((v, i) => (i === view ? res : v));
    setRun(next);
    saveRun(day.date, next);
    setChosen(null);
    setRevealing(true);
    if (res.held && res.grade && res.pick.clubs) {
      const clubs = res.pick.clubs;
      const n = recordCards([{
        id: res.pick.id, name: res.pick.name, grade: res.grade, board: day.date,
        via: clubs.map((c) => c.club.name), clubs: clubs.map((c) => c.id), date: localDate(),
        source: { label: `${NAME} #${day.day}`, href: `/step?date=${day.date}` },
        ...(res.pick.image ? { image: res.pick.image } : {}),
      }]);
      setNews(n[res.pick.id] ?? null);
    } else setNews(null);
  }

  function next() {
    setNews(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === STEPS - 1) setFinished(true);
    else setView(view + 1);
  }

  if (finished && done) return <Summary day={day} run={run} />;

  const clubName = shortClubName(step.club.club.name);
  const playerName = plateName(step.player.id, step.player.name);

  return (
    <>
      <ol className="step-pips" aria-label="Steps">
        {run.map((v, i) => (
          <li key={i} className={`step-pip ${i === view ? 'is-current' : ''} ${v && !(revealing && i === view) ? (v.held ? 'is-held' : 'is-missed') : ''}`}>
            {v && !(revealing && i === view) ? (v.held ? '✓' : '✕') : i + 1}
          </li>
        ))}
      </ol>

      <Track day={day} run={run} view={view} chosen={chosen} hidden={revealing ? view : -1} onOpen={() => !verdict && setSearching(true)} />

      <section className="step-act" aria-live="polite">
        {verdict ? (
          <>
            <div className="step-verdict">
              {revealing || verdict.held ? <span className="step-verdict__kicker">Ball knowledge</span> : null}
              <Slam
                key={view}
                verdict={verdict}
                ground={cardGround(verdict.pick, step.playerFirst)}
                news={news ?? undefined}
                play={revealing}
                onDone={() => setRevealing(false)}
              />
              {revealing ? null : <After verdict={verdict} playerFirst={step.playerFirst} />}
            </div>
            {revealing ? null : <button type="button" className="seal" onClick={next}>{view === STEPS - 1 ? 'Your run' : 'Next'}</button>}
          </>
        ) : chosen ? (
          <>
            <button type="button" className="seal" onClick={lock} disabled={pending}>{pending ? 'Locking…' : 'Lock it in'}</button>
            <button type="button" className="step-act__change" onClick={() => setSearching(true)}>Change</button>
          </>
        ) : (
          <>
            <p className="step-act__rule">
              {step.playerFirst
                ? <>Played for one of <b>{playerName}’s</b> clubs and for <b>{clubName}</b></>
                : <>Played for <b>{clubName}</b> and one of <b>{playerName}’s</b> clubs</>}
            </p>
            <button type="button" className="seal" onClick={() => setSearching(true)}>Name a player</button>
          </>
        )}
      </section>

      <SearchSheet
        slot={searching ? view : null}
        title={`Step ${view + 1}`}
        between={step.playerFirst ? [playerName, clubName] : [clubName, playerName]}
        current={chosen}
        index={index}
        taken={taken}
        onPick={(id) => { setChosen(index?.find((e) => e.player.id === id)?.player ?? null); setSearching(false); }}
        onRemove={() => { setChosen(null); setSearching(false); }}
        onClose={() => setSearching(false)}
      />
    </>
  );
}

/**
 * The whole run as one strip, P1 ? C1 ? P2 ? C2 ? P3, slid so the step on
 * screen is in the middle. Moving on is the strip sliding one club along.
 */
function Track({ day, run, view, chosen, hidden, onOpen }: {
  day: StepDay; run: Run; view: number; chosen: NameEntry | null; hidden: number; onOpen: () => void;
}) {
  const items: ({ kind: 'player'; p: StepGiven } | { kind: 'club'; c: StepClub } | { kind: 'gap'; i: number })[] = [];
  day.steps.forEach((s, i) => {
    if (i === 0) items.push(s.playerFirst ? { kind: 'player', p: s.player } : { kind: 'club', c: s.club });
    items.push({ kind: 'gap', i });
    items.push(s.playerFirst ? { kind: 'club', c: s.club } : { kind: 'player', p: s.player });
  });
  const near = (k: number) => k >= view * 2 && k <= view * 2 + 2;

  const linkState = (gap: number) => {
    const v = gap === hidden ? null : run[gap];
    return v ? (v.held ? 'link--held' : 'link--broken') : '';
  };

  return (
    <div className="step-track" aria-label={`Step ${view + 1} of ${STEPS}`}>
      <div className="step-track__strip" style={{ ['--at' as string]: view }}>
        {items.flatMap((it, k) => {
          const cell = it.kind === 'player'
            ? <StickerFace player={it.p} image={it.p.image ?? undefined} ground={solid(it.p.ground)} className="sticker--still" />
            : it.kind === 'club'
              ? <ClubSticker c={it.c} />
              : <Gap index={it.i} verdict={run[it.i] ?? null} hidden={it.i === hidden} live={it.i === view} chosen={it.i === view ? chosen : null} playerFirst={day.steps[it.i]!.playerFirst} onOpen={onOpen} />;
          const out = [<div key={`c${k}`} className={`step-track__cell ${near(k) ? 'is-near' : ''}`}>{cell}</div>];
          // The link after cell k joins it to cell k + 1; both touch gap floor(k / 2).
          if (k < items.length - 1) {
            out.push(
              <span key={`l${k}`} className={`link link--h step-track__link ${near(k) && near(k + 1) ? 'is-near' : ''} ${linkState(Math.floor(k / 2))}`} aria-hidden>
                <span className="link__rule" />
              </span>,
            );
          }
          return out;
        })}
      </div>
    </div>
  );
}

/** The gap: a silhouette to tap, the name you chose, or the pick once judged. */
function Gap({ index, verdict, hidden, live, chosen, playerFirst, onOpen }: {
  index: number; verdict: Verdict | null; hidden: boolean; live: boolean; chosen: NameEntry | null; playerFirst: boolean; onOpen: () => void;
}) {
  if (verdict && hidden) {
    return (
      <div className="step-gap">
        <StickerFace player={verdict.pick} image={verdict.pick.image ?? undefined} ground={neutral()} className="sticker--still" />
      </div>
    );
  }
  if (verdict) {
    return (
      <div className="step-gap">
        <StickerFace
          player={verdict.pick}
          image={verdict.pick.image ?? undefined}
          ground={verdict.held ? cardGround(verdict.pick, playerFirst) : neutral()}
          className={`sticker--still ${verdict.held ? '' : 'step-gap--missed'}`}
        />
        {verdict.held && verdict.grade ? <GradeChip grade={verdict.grade} /> : <span className="step-miss step-miss--sm" aria-label="Doesn’t fit">✕</span>}
      </div>
    );
  }
  if (live && chosen) {
    return (
      <button type="button" className="step-gap step-gap--chosen" onClick={onOpen} aria-label={`${chosen.name}, tap to change`}>
        <Sticker player={chosen} image={chosen.image} ground={neutral()} />
      </button>
    );
  }
  if (live) return <EmptySticker index={index} focused={false} over={false} onFocus={onOpen} hint="Who?" />;
  return (
    <div className="sticker sticker--empty sticker--still step-gap--later" aria-hidden>
      <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
      <span className="sticker__plate"><span className="sticker__hint">?</span></span>
    </div>
  );
}

/**
 * After the reveal: the club that linked the pick to the given (or that it
 * does not fit), then the obvious answer unless that was the pick.
 */
function After({ verdict, playerFirst }: { verdict: Verdict; playerFirst: boolean }) {
  const via = verdict.held ? verdict.pick.clubs?.[0] : undefined;
  const o = verdict.obvious;
  return (
    <div className="step-after">
      {via ? (
        <p className="step-via">
          <span className="step-via__kicker">Linked by</span>
          <ClubBadge clubId={via.id} club={via.club} size={22} />
          <b>{shortClubName(via.club.name)}</b>
        </p>
      ) : <p className="step-verdict__head display">Doesn’t fit</p>}
      {o && o.id !== verdict.pick.id ? (
        <div className="step-obvious">
          <StickerFace player={o} image={o.image ?? undefined} ground={cardGround(o, playerFirst)} className="sticker--still" />
          <div className="step-obvious__text">
            <span className="step-via__kicker">The obvious one</span>
            <b>{o.name}</b>
            {o.clubs ? <span className="step-obvious__via">via {shortClubName(o.clubs[0].club.name)}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A club as a sticker: its crest on its colour, its name on the plate. */
function ClubSticker({ c }: { c: StepClub }) {
  const name = shortClubName(c.club.name);
  return (
    <div className="sticker sticker--still step-club" title={c.club.name}>
      <div className="sticker__photo" style={{ background: c.colour }}>
        <span className="step-club__crest"><ClubBadge clubId={c.id} club={c.club} size={56} /></span>
      </div>
      <div className="sticker__plate">
        <span className={`sticker__name ${name.length > 10 ? 'sticker__name--long' : ''}`}>{name.toUpperCase()}</span>
      </div>
    </div>
  );
}

/** A pick's ground: the club it shared with the given on that side, the step's club on the other. */
function cardGround(card: StepCard, playerFirst: boolean): Ground {
  if (!card.clubs) return neutral();
  const [via, club] = card.clubs;
  return playerFirst
    ? { a: via.colour, b: club.colour, liveA: true, liveB: true }
    : { a: club.colour, b: via.colour, liveA: true, liveB: true };
}

/** The end of the run: the word, the cards, the share, then the deepest answers. */
function Summary({ day, run }: { day: StepDay; run: Run }) {
  const grades = run.map((v) => v?.grade ?? null);
  const word = runGrade(grades);
  const [copied, setCopied] = useState(false);
  async function share() {
    await navigator.clipboard?.writeText(shareLine(day.day, grades)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <section className="step-end">
      <div className="step-end__head">
        <span className="step-verdict__kicker">Ball knowledge</span>
        {word ? <GradeChip grade={word} /> : <span className="step-end__none display">None</span>}
      </div>
      <ol className="step-end__cards">
        {run.map((v, i) => (
          <li key={i}>
            {v && v.held && v.grade
              ? <Slab grade={v.grade} player={v.pick} image={v.pick.image ?? undefined} ground={cardGround(v.pick, day.steps[i]!.playerFirst)} size="sm" />
              : (
                <div className="step-end__miss">
                  {v ? <StickerFace player={v.pick} image={v.pick.image ?? undefined} ground={neutral()} className="sticker--still step-gap--missed" /> : null}
                  <span className="step-miss" aria-label="Doesn’t fit">✕</span>
                </div>
              )}
          </li>
        ))}
      </ol>
      <button type="button" className="seal" onClick={share}>{copied ? 'Copied' : 'Share'}</button>

      <h2 className="step-end__sub display">Deepest answers</h2>
      <ol className="step-end__deep">
        {run.map((v, i) => {
          const e = v?.elite;
          if (!e) return null;
          const s = day.steps[i]!;
          return (
            <li key={i} className="step-end__deepitem">
              <StickerFace player={e} image={e.image ?? undefined} ground={cardGround(e, s.playerFirst)} className="sticker--still" />
              <span className="step-end__tag">
                {v?.pick.id === e.id ? 'You found it' : v?.grade === 'elite' ? 'Yours went deeper' : `${plateName(s.player.id, s.player.name)} · ${shortClubName(s.club.club.name)}`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="step-end__links">
        <a href="/step/archive">Archive</a>
        <a href="/collection">Your cards</a>
      </p>
    </section>
  );
}

/** The mark: two links and a gap. */
export function StepMark() {
  return (
    <svg className="masthead__mark" viewBox="0 0 32 32" aria-hidden>
      <rect x="1.5" y="9" width="8" height="14" rx="1" fill="currentColor" />
      <rect x="12" y="9" width="8" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.4 2" />
      <rect x="22.5" y="9" width="8" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

