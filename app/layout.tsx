import type { ReactNode } from 'react';
import { Big_Shoulders, Libre_Franklin } from 'next/font/google';
import './globals.css';
import { GAMES } from '../src/games';

/**
 * The two faces, self-hosted at build time by next/font so the page never
 * waits on a third-party stylesheet.
 *
 * Big Shoulders is the album's voice: condensed, athletic, made for a
 * nameplate in caps and a number in a corner. Libre Franklin does the
 * reading. Both are exposed as CSS variables and picked up in globals.css.
 */
const display = Big_Shoulders({
  subsets: ['latin'],
  weight: 'variable',
  axes: ['opsz'],
  variable: '--font-display',
  display: 'swap',
});
const text = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-text',
  display: 'swap',
});

/**
 * Runs in the page before its first frame (stringified below, so it must
 * stand alone). A page change between the hub and a game's front page is the
 * slow, staged move in MOTION (globals.css): mark the view transition with
 * the type `morph`, and put .vt-arrived on <html> until everything has risen
 * in. Back on the hub, the tile you came from keeps its ground and miniature
 * (they flew there); the rest rise in. Any other page change is a plain
 * cross-fade.
 */
function morph(fronts: string[]) {
  addEventListener('pagereveal', (e) => {
    const t = (e as Event & { viewTransition?: { types?: Set<string>; finished: Promise<void> } }).viewTransition;
    const from = (window as Window & { navigation?: { activation?: { from?: { url: string } } } }).navigation?.activation?.from;
    if (!t || !t.types || !from) return;
    const a = new URL(from.url).pathname;
    const b = location.pathname;
    if (!((a === '/' && fronts.includes(b)) || (b === '/' && fronts.includes(a)))) return;
    t.types.add('morph');
    if (b === '/') {
      const keep = document.createElement('style');
      keep.textContent = `.vt-arrived .hub__tile[href="${a}"] > :is(.hub__ground, .hub__mini) { animation: none; }`;
      document.head.appendChild(keep);
    }
    const root = document.documentElement;
    root.classList.remove('vt-arrived');
    void root.offsetWidth;
    root.classList.add('vt-arrived');
    t.finished
      .then(() => Promise.all(document.getAnimations()
        .filter((x) => (x as CSSAnimation).animationName === 'rise-in')
        .map((x) => x.finished.catch(() => {}))))
      .finally(() => root.classList.remove('vt-arrived'));
  });
}
const MORPH = `(${morph.toString()})(${JSON.stringify(GAMES.map((g) => g.href))})`;

export const metadata = {
  title: 'Chain',
  description: 'A football chain a day. Name the players who link the givens.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the script below may add a class before React hydrates.
    <html lang="en" className={`${display.variable} ${text.variable}`} suppressHydrationWarning>
      <head>
        {/* The hub-to-game move: see morph() above. */}
        <script dangerouslySetInnerHTML={{ __html: MORPH }} />
        {/* The parked XI board's face. Nothing else loads from here. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        {children}
        <footer className="site-foot"><a href="/">All games</a> · <a href="/credits">Photo and data credits</a></footer>
      </body>
    </html>
  );
}
