'use client';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { localDate } from '../../src/lib/daily';
import { allRuns, streakDates, streakOf } from '../../src/lib/run/progress';
import { money, reportValue, runScore } from '../../src/lib/run/score';
import { RUN_TASKS } from '../../src/lib/run/tasks';

const ART = '/hub/office';

/** [name, image, href (none: no route on main yet), left %, top %, width %, tilt]. Jonno's arranged layout, 2026-11-24; Rondo is parked off the board. */
const ITEMS: readonly [string, string, string | null, number, number, number, number][] = [
  ['Spoofed', 'spoofed', '/spoofed', 20.95, 9.6, 7.81, -2],
  ['Chain', 'chain', '/chain', 31.29, 9.02, 8, 1.5],
  ['Odd Man Out', 'oddman', '/odd-man-out', 26.48, 25.2, 9.17, -1],
  ['Pitch Pin', 'pitchpin', '/pin', 55.37, 9.94, 7.16, 1.5],
  ['Pecking Order', 'pecking', null, 65, 25.43, 2.8, -1.5],
  ['Season Line', 'seasonline', '/season-line', 56.08, 30.64, 6.57, -1],
];

/** The default camera: the plate area Jonno framed, covering the window below the bar. */
const FRAME = { x0: 4.35, x1: 89.1, y0: 0, y1: 70.8 };
/** Phone stopgap: the clipboard, whole, with the games strip under it. Clipboard is x 38.71-53.67%, y 15.03-54.6% of the plate. */
const PHONE_FRAME = { x0: 37, x1: 55.4, y0: 13.8, y1: 55.8 };
const BAR = 56, STRIP = 116, PHONE_MAX = 700;

const TOPS = [48.4, 54.8, 61.2, 67.6, 74.0, 80.4];
const pad = (n: number) => String(n).padStart(2, '0');

interface Today { done: boolean[]; filed: boolean; value: string; streak: number; label: string }

function readToday(): Today {
  const date = localDate(), runs = allRuns(), day = runs[date];
  const done = RUN_TASKS.map((t) => !!day?.results[t.id]);
  const filed = done.every(Boolean);
  const score = day?.score ?? (filed ? runScore(RUN_TASKS.map((t) => day!.results[t.id]!.score)) : 0);
  return {
    done, filed, value: money(reportValue(score)),
    streak: streakOf(streakDates(runs), date).current,
    label: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''),
  };
}

function Wordmark() {
  return (
    <span className="hx-wm H" style={{ color: '#FBF6EA' }}>
      <span style={{ color: '#F5AF3E' }}>F<svg className="oo" aria-label="oo" style={{ '--frame': '#F5AF3E', '--lens': '#FBF6EA', '--pupil': '#19212A' } as React.CSSProperties}><use href="#hx-oob" /></svg>tball</span>Scouted
    </span>
  );
}

/** Time to the next daily: local midnight, when src/lib/daily localDate() rolls over. Seconds show on hover. */
function Lcd() {
  const [s, setS] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const now = new Date(), next = new Date(now); next.setHours(24, 0, 0, 0); setS(Math.floor((+next - +now) / 1000)); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hx-watch" role="timer" aria-label="Time until the next daily">
      <span>{s === null ? '' : <>{pad(Math.floor(s / 3600))}<span className="c">:</span>{pad(Math.floor(s / 60) % 60)}<span className="s">:{pad(s % 60)}</span></>}</span>
    </div>
  );
}

export default function Hub() {
  const [t, setT] = useState<Today | null>(null);
  const scene = useRef<HTMLDivElement>(null), cam = useRef<HTMLDivElement>(null), dust = useRef<HTMLCanvasElement>(null);
  const title = useRef<HTMLHeadingElement>(null), eyebrow = useRef<HTMLDivElement>(null);

  // The run lives in this browser, so it is read after mount; it is read again on return (back button, tab focus) and at midnight.
  useEffect(() => {
    const read = () => setT(readToday());
    read();
    const untilMidnight = () => { const m = new Date(); m.setHours(24, 0, 1, 0); return +m - Date.now(); };
    let at = setTimeout(function roll() { read(); at = setTimeout(roll, untilMidnight()); }, untilMidnight());
    const vis = () => { if (!document.hidden) read(); };
    addEventListener('pageshow', read); document.addEventListener('visibilitychange', vis);
    return () => { clearTimeout(at); removeEventListener('pageshow', read); document.removeEventListener('visibilitychange', vis); };
  }, []);

  // Camera: the default framing, following the window size. The desktop sum is the draft's own (it ignores the scene's centring
  // offset); Jonno framed it that way. The phone frame contains the clipboard, so it does account for the offset.
  useLayoutEffect(() => {
    const place = () => {
      const sc = scene.current!, c = cam.current!;
      const phone = innerWidth < PHONE_MAX, F = phone ? PHONE_FRAME : FRAME;
      const W = sc.offsetWidth, H = sc.offsetHeight, w = W * (F.x1 - F.x0) / 100, h = H * (F.y1 - F.y0) / 100;
      const availH = innerHeight - BAR - (phone ? STRIP : 0);
      const z = phone ? Math.min(innerWidth / w, availH / h) : Math.max(innerWidth / w, availH / h);
      const left = phone ? (innerWidth - W) / 2 : 0;
      const x = (innerWidth - w * z) / 2 - (left + W * F.x0 / 100) * z;
      const y = BAR + (phone ? (availH - h * z) / 2 : 0) - H * F.y0 / 100 * z;
      c.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
      c.dataset.ready = '';
    };
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, []);

  // The title and eyebrow shrink to fit their line.
  useEffect(() => {
    const fit = () => {
      for (const el of [title.current, eyebrow.current]) {
        if (!el) continue;
        el.style.fontSize = '';
        let s = parseFloat(getComputedStyle(el).fontSize), n = 0;
        while (el.scrollWidth > el.clientWidth + 1 && n++ < 40) el.style.fontSize = (s *= .96) + 'px';
      }
    };
    fit();
    document.fonts.ready.then(fit);
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [t]);

  // Pointer parallax and the dust motes. Neither runs for reduced motion.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const s = scene.current!.style;
    const move = (e: PointerEvent) => {
      s.setProperty('--px', (e.clientX / innerWidth * 2 - 1).toFixed(3));
      s.setProperty('--py', (e.clientY / innerHeight * 2 - 1).toFixed(3));
    };
    addEventListener('pointermove', move);

    // ponytail: plain 2D canvas, ~40 dots; a sprite pass if it ever shows in a profile.
    const cv = dust.current!, cx = cv.getContext('2d')!;
    let motes: { x: number; y: number; r: number; vx: number; vy: number; p: number }[] = [], raf = 0;
    const size = () => {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = devicePixelRatio || 1; // layout size, not the zoomed one
      cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes = Array.from({ length: 42 }, () => ({ x: Math.random() * w * .55, y: Math.random() * h * .8, r: .6 + Math.random() * 1.4, vx: .04 + Math.random() * .12, vy: -.02 + Math.random() * .08, p: Math.random() * 6.28 }));
    };
    const draw = (time: number) => {
      const w = cv.clientWidth, h = cv.clientHeight;
      cx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy + Math.sin(time / 1800 + m.p) * .05;
        if (m.x > w * .6 || m.y > h * .85) { m.x = Math.random() * w * .15; m.y = Math.random() * h * .6; }
        // Only bright inside the diagonal beam from the window (upper left).
        const beam = Math.max(0, 1 - Math.abs((m.y / h) - (m.x / w) * .9 - .05) * 4);
        const a = beam * (.35 + .35 * Math.sin(time / 900 + m.p));
        if (a <= .02) continue;
        cx.fillStyle = `rgba(255,236,200,${a.toFixed(3)})`;
        cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 6.283); cx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    size(); addEventListener('resize', size); raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', move); removeEventListener('resize', size); };
  }, []);

  const n = t ? t.done.filter(Boolean).length : 0, filed = !!t?.filed;
  const streak = t && t.streak > 0 ? <span>{t.streak}-day streak</span> : null;

  return (
    <div className="hx">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <symbol id="hx-oob" viewBox="25 90 370 245">
          <path style={{ fill: 'var(--lens)' }} d="M52.98 249.63A23 23 0 0 1 74.85 219.5L154.62 219.5A23 23 0 0 1 176.83 248.49L162.96 299.92A17 17 0 0 1 146.55 312.5L85.82 312.5A17 17 0 0 1 69.66 300.77Z" />
          <path style={{ fill: 'var(--lens)' }} d="M243.17 248.49A23 23 0 0 1 265.38 219.5L345.15 219.5A23 23 0 0 1 367.02 249.63L350.34 300.77A17 17 0 0 1 334.18 312.5L273.45 312.5A17 17 0 0 1 257.04 299.92Z" />
          <circle style={{ fill: 'var(--pupil)' }} cx="139" cy="237.5" r="24" /><circle style={{ fill: 'var(--lens)' }} cx="148" cy="227.5" r="5" />
          <circle style={{ fill: 'var(--pupil)' }} cx="319" cy="237.5" r="24" /><circle style={{ fill: 'var(--lens)' }} cx="328" cy="227.5" r="5" />
          <path style={{ fill: 'var(--frame)' }} fillRule="evenodd" d="M25.23 235.49A29 29 0 0 1 52.8 197.5L159.84 197.5A41 41 0 0 1 199.43 249.17L182.61 311.57A31 31 0 0 1 152.68 334.5L78.56 334.5A29 29 0 0 1 50.99 314.49ZM52.98 249.63A23 23 0 0 1 74.85 219.5L154.62 219.5A23 23 0 0 1 176.83 248.49L162.96 299.92A17 17 0 0 1 146.55 312.5L85.82 312.5A17 17 0 0 1 69.66 300.77ZM220.57 249.17A41 41 0 0 1 260.16 197.5L367.2 197.5A29 29 0 0 1 394.77 235.49L369.01 314.49A29 29 0 0 1 341.44 334.5L267.32 334.5A31 31 0 0 1 237.39 311.57ZM243.17 248.49A23 23 0 0 1 265.38 219.5L345.15 219.5A23 23 0 0 1 367.02 249.63L350.34 300.77A17 17 0 0 1 334.18 312.5L273.45 312.5A17 17 0 0 1 257.04 299.92Z" />
          <rect style={{ fill: 'var(--frame)' }} x="199" y="230" width="22" height="22" />
          <rect style={{ fill: 'var(--frame)' }} x="45" y="147" width="129" height="22" rx="4" />
          <path style={{ fill: 'var(--frame)', stroke: 'var(--frame)' }} strokeWidth="8" strokeLinejoin="round" d="M222.73 129.50A113.0 113.0 0 0 1 368.75 120.56L360.36 131.76A99.0 99.0 0 0 0 232.43 139.59Z" />
        </symbol>
      </svg>
      <div className="hx-bar"><Link href="/" className="hx-wm H" aria-label="FootballScouted, all games"><Wordmark /></Link><nav><Link href="/">All games</Link></nav></div>
      <div className="hx-stage">
        <div className="hx-cam" ref={cam}>
          <div className="hx-scene" ref={scene}>
            <div className="hx-layer" style={{ '--d': 4 } as React.CSSProperties}>
              <img className="hx-art" src={`${ART}/plate2.png`} alt="" fetchPriority="high" />
              <img className="hx-olise" src={`${ART}/olise-grain.png`} alt="" />
              <img className="hx-prop hx-sway" src={`${ART}/pennant-ink.png`} alt="" style={{ left: '15.6%', top: '10%', width: '3.2%', animationDelay: '-2s' }} />
              <div className="hx-sun" />
              <div className="hx-glow" />
              <div className="hx-steam"><i /><i /><i /></div>
              <canvas className="hx-dust" ref={dust} />
            </div>
            <div className="hx-layer hx-board" style={{ '--d': 7 } as React.CSSProperties}>
              {ITEMS.map(([name, img, href, l, tp, w, r]) => {
                const style = { left: `${l}%`, top: `${tp}%`, width: `${w}%`, '--r': `${r}deg` } as React.CSSProperties;
                const inner = <><img src={`${ART}/${img}.png`} alt="" /><b>{name}{name === 'Chain' && filed ? <span className="hx-flag">Next</span> : null}</b></>;
                return href
                  ? <Link key={name} className="hx-item" href={href} style={style} aria-label={name}>{inner}</Link>
                  : <div key={name} className="hx-item" style={style} title="Coming soon">{inner}</div>;
              })}
              <Lcd />
              <div className="hx-clip">
                <div className="cb"><img src={`${ART}/clipboard-ink-plain-cut.png`} alt="" /></div>
                <div className="hx-sheet"><svg viewBox="0 0 500 753" preserveAspectRatio="none" aria-hidden="true"><rect x="16" y="40" width="468" height="697" fill="none" stroke="var(--mark)" strokeWidth="1.6" /><path d="M16 62A22 22 0 0 0 38 40M462 40A22 22 0 0 0 484 62M484 715A22 22 0 0 0 462 737M38 737A22 22 0 0 0 16 715" fill="none" stroke="var(--mark)" strokeWidth="1.6" /><path d="M16 388.5H30M484 388.5H470" stroke="var(--mark)" strokeWidth="1.6" /></svg></div>
                <div className="hx-head">
                  <div className="eyebrow" ref={eyebrow}>{t ? <><span>{filed ? `Filed · ${t.label}` : t.label}</span>{streak}</> : null}</div>
                  <h4 className="H" ref={title}>{t ? (filed ? 'Today’s report' : 'Today’s assignment') : ''}</h4>
                  <p className="sub">{t && !filed ? (n ? `${n} of ${RUN_TASKS.length} done.` : 'Six quick tasks. One report.') : ''}</p>
                  <div className="hx-go">
                    {!t ? null : filed
                      ? <Link className="hx-result" href="/run" aria-label={`Today’s report, valued at ${t.value}. Open it.`}><small>Valued at</small>{t.value}<svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength={1} fill="none" strokeLinecap="round" d="M58 4C30 1 6 9 4 27s20 30 50 29 44-12 42-29C94 9 70 2 44 6" /></svg></Link>
                      : <Link className="hx-btn H" href="/run">{n ? 'Continue' : 'Start'}</Link>}
                  </div>
                </div>
                <ol className="hx-tasks">
                  {RUN_TASKS.map((task, i) => (
                    <li key={task.id} className={t?.done[i] ? 'done' : ''} style={{ top: `${TOPS[i]}%` }}>
                      <i className="hx-box"><svg viewBox="0 0 22 22" aria-hidden="true"><path className="biro" pathLength={1} d="M4.2 11.6c1.4 1.1 2.6 2.6 3.8 4.6 2.1-4.4 5.2-8.3 10.4-12.2" /></svg></i>
                      <span className="hx-nm">{task.name}<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path className="biro" pathLength={1} d="M1 6.2C18 4.4 31 7.1 49 5.2S81 4.1 99 5.6" /></svg></span>
                      {t?.done[i] ? <span className="hx-sr">done</span> : null}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
      <nav className="hx-games" aria-label="Games">
        {ITEMS.filter(([, , href]) => href).map(([name, , href]) => <Link key={name} href={href!}>{name}</Link>)}
      </nav>
    </div>
  );
}
