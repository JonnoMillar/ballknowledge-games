/**
 * What picture to put on a player's card.
 *
 * Server-safe on purpose: both pages are server components, and a function
 * exported from a `'use client'` file cannot be called from one — the same
 * trap that sent `clubView` into src/lib/clubs.ts.
 */

/**
 * A picture ready to put in a frame.
 *
 * `fit` is not cosmetic. A cutout is the whole player against transparency and
 * has to be shown WHOLE — cropping it beheads him. A press photo is the
 * opposite: Commons framing runs from tight portrait to a figure somewhere in
 * a stadium, so it is cropped to the frame and anchored high. Getting this
 * backwards letterboxes every press photo inside its mount.
 */
export interface PortraitImage {
  url: string;
  fit: 'cover' | 'contain';
}

/** A portrait resolved by scripts/fetch-portraits.ts. */
export interface PortraitRecord {
  source: 'cutout' | 'commons' | 'none';
  url?: string;
  /** Commons only: the capture year the photo was accepted on. */
  year?: number;
  career?: [number, number];
  reason?: string;
}

/**
 * Commons thumbnail. Special:FilePath redirects to a rendered thumbnail at the
 * requested width, so we never pull a full-size original. Files reached this
 * way are CC BY / CC BY-SA / public domain and need an attribution page before
 * this ships publicly.
 */
export function commonsThumb(filename: string, width: number): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

/**
 * The picture for each player, as a ready URL.
 *
 * A resolved portrait WINS over the raw Commons photo, and a resolved `none`
 * beats it too — that is the whole point. 31% of the photos in images.json
 * were taken after the player retired, so a card that falls back to one is
 * showing a pundit in a suit. An empty card is the honest answer; the crest
 * and the club colours still carry it.
 *
 * Players the resolver has not reached yet keep their old photo, so the board
 * degrades to its previous behaviour rather than emptying out mid-migration.
 */
export function portraitUrls(
  images: Record<string, string>,
  portraits: Record<string, PortraitRecord>,
  width = 200,
): Record<string, PortraitImage> {
  const out: Record<string, PortraitImage> = {};
  // An unresolved player keeps a press photo, which is cropped to the frame.
  for (const [id, file] of Object.entries(images)) {
    out[id] = { url: commonsThumb(file, width), fit: 'cover' };
  }
  for (const [id, p] of Object.entries(portraits)) {
    if (p.source !== 'none' && p.url) {
      out[id] = { url: p.url, fit: p.source === 'cutout' ? 'contain' : 'cover' };
    } else {
      delete out[id];
    }
  }
  return out;
}
