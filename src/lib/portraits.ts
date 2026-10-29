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
 * `fit` is not cosmetic. A TheSportsDB cutout (dev only) is the whole player
 * against transparency and has to be shown WHOLE: cropping it beheads him. Our
 * processed cutouts are pre-cropped (`box`); `cover` survives only in the
 * Chain link codec (src/lib/chain/client.ts).
 */
export interface PortraitImage {
  url: string;
  /**
   * `box`: one of our processed cutouts, square, face in the same box every
   * time, body running off the bottom edge, shown on the grade material.
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
 * The picture for each player, as a ready URL: our own processed cutout, and nothing else.
 *
 * Everyone without one gets the kit card from the caller, which knows the
 * club (see `kitCard`). That includes players who used to carry a raw
 * Commons photo from data/images.json or an unjudged `commons` record: 31% of
 * those were taken after the player retired, and the rest were never looked
 * at, so a kit card is the honest answer (Jonno, 2026-10-29).
 *
 * TheSportsDB cutouts carry no `strCreativeCommons` flag, and its terms say
 * such artwork must not be used publicly, websites included. So they appear
 * only with `allowUncleared` (local development).
 */
export function portraitUrls(
  portraits: Record<string, PortraitRecord>,
  allowUncleared = false,
): Record<string, PortraitImage> {
  const out: Record<string, PortraitImage> = {};
  for (const [id, p] of Object.entries(portraits)) {
    if (!p.url) continue;
    if (p.source === 'processed') out[id] = { url: p.url, fit: 'box' };
    else if (p.source === 'cutout' && allowUncleared) out[id] = { url: p.url, fit: 'contain' };
  }
  return out;
}
