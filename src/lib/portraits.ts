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
  /**
   * `box`: one of our processed cutouts, square, face in the same box every
   * time, body running off the bottom edge, shown on the club's colour.
   * `kit`: no photo; the kit card, with `club` for the crest (`url` is empty).
   */
  fit: 'cover' | 'contain' | 'box' | 'kit';
  club?: string;
}

/** The kit card: shown where no good photo exists. */
export const kitCard = (club: string | undefined): PortraitImage => ({ url: '', fit: 'kit', ...(club ? { club } : {}) });

/** A portrait resolved by scripts/fetch-portraits.ts. */
export interface PortraitRecord {
  /** `processed`: our own cutout of a Commons photo, hosted under /portraits (scripts/photos). */
  source: 'cutout' | 'commons' | 'processed' | 'none';
  url?: string;
  /** Processed and commons: the Commons file it came from, credited in data/credits.json. */
  file?: string;
  /** Commons only: the capture year the photo was accepted on. */
  year?: number;
  career?: [number, number];
  reason?: string;
  /** Cutouts only: the in-era Commons photo to show where the cutout may not be. */
  alt?: { url: string; year: number } | null;
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
 * (A player left without any image gets the kit card from the caller, which
 * knows the club: see `kitCard`.)
 *
 * TheSportsDB cutouts carry no `strCreativeCommons` flag, and its terms say
 * such artwork must not be used publicly, websites included. So they appear
 * only with `allowUncleared` (local development); everywhere else a cutout
 * gives way to its in-era Commons `alt`, or to an empty card.
 */
export function portraitUrls(
  images: Record<string, string>,
  portraits: Record<string, PortraitRecord>,
  width = 200,
  allowUncleared = false,
): Record<string, PortraitImage> {
  const out: Record<string, PortraitImage> = {};
  // An unresolved player keeps a press photo, which is cropped to the frame.
  for (const [id, file] of Object.entries(images)) {
    out[id] = { url: commonsThumb(file, width), fit: 'cover' };
  }
  for (const [id, p] of Object.entries(portraits)) {
    if (p.source === 'cutout' && !allowUncleared) {
      if (p.alt) out[id] = { url: p.alt.url, fit: 'cover' };
      else delete out[id];
    } else if (p.source !== 'none' && p.url) {
      out[id] = { url: p.url, fit: p.source === 'cutout' ? 'contain' : p.source === 'processed' ? 'box' : 'cover' };
    } else {
      delete out[id];
    }
  }
  return out;
}
