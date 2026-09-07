/**
 * Club records, and the narrowing that happens on the way to the browser.
 *
 * This lives outside components/ deliberately. ClubBadge is a client component,
 * and a server component cannot call a function exported from one — the page
 * that projects the club map runs on the server, so the projection has to sit
 * in a module with no 'use client' on it.
 */

/** A club as stored in data/clubs.json, by scripts/fetch-club-badges.ts. */
export interface ClubRecord {
  name: string;
  /** Commons filename from Wikidata's P154. Present for about 1 club in 6. */
  badge?: string;
  /** Local file under public/badges, when the cache has been fetched. */
  crest?: string;
  /** Remote thumbnail for the same crest, used when the cache is absent. */
  crestUrl?: string;
  /** `commons` is freely licensed; `en` is a non-free local Wikipedia file. */
  crestSource?: 'commons' | 'en';
}

/**
 * A club as the browser sees it.
 *
 * The full record carries a 120-character thumbnail URL per club, and any of
 * the 5,764 clubs can turn up in a link once the player starts placing people,
 * so the whole map has to cross to the browser. Sent whole that is 1 MB of
 * props on every page load; sent as this it is a tenth of that, because a
 * crest is addressed by club id at a stable path and needs no URL of its own.
 */
export interface ClubView {
  name: string;
  /** Whether a crest exists to serve. Absent means: draw the monogram. */
  crest?: boolean;
}

/**
 * Where a club's crest is served from, cached or not.
 *
 * public/badges wins when the cache has been fetched; app/badges/[file] answers
 * with a redirect when it has not.
 */
export function crestPath(clubId: string): string {
  return `/badges/${clubId}.png`;
}

/** Narrow the on-disk record to what the browser actually needs. */
export function clubView(club: ClubRecord): ClubView {
  return club.crestUrl || club.crest ? { name: club.name, crest: true } : { name: club.name };
}
