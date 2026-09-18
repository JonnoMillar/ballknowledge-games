import type { ReactNode } from 'react';
import { Big_Shoulders, Libre_Franklin } from 'next/font/google';
import './globals.css';

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

export const metadata = {
  title: 'Chain',
  description: 'A football chain a day. Name the players who link the givens.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <head>
        {/* The scouting-sheet faces. Still loaded because the sealed sheet
            (LockIn) and the search rail are drawn in them until their own
            rebuild stages; this tag goes with them. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=Alfa+Slab+One&family=Archivo+Narrow:wght@500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
