import { describe, it, expect } from 'vitest';
import { commonsThumb, portraitUrls, type PortraitRecord } from '../src/lib/portraits';

const cutout = (url: string, alt?: PortraitRecord['alt']): PortraitRecord => ({ source: 'cutout', url, alt });
const commons = (url: string, year: number): PortraitRecord => ({ source: 'commons', url, year });
const none = (reason: string): PortraitRecord => ({ source: 'none', reason });

describe('portraitUrls in public', () => {
  // TheSportsDB cutouts carry no strCreativeCommons flag, and its terms say
  // such artwork must not be used publicly. Public is the default.
  it('never shows a cutout', () => {
    const out = portraitUrls({}, { Q1: cutout('https://tsdb/q1.png') });
    expect(out['Q1']).toBeUndefined();
  });

  it('shows the in-era Commons alternative instead, cropped like any press photo', () => {
    const out = portraitUrls({ Q1: 'Old.jpg' }, { Q1: cutout('https://tsdb/q1.png', { url: 'https://commons/In-era.jpg', year: 2004 }) });
    expect(out['Q1']).toEqual({ url: 'https://commons/In-era.jpg', fit: 'cover' });
  });

  it('empties the card rather than fall back to an undated photo when there is no alternative', () => {
    expect(portraitUrls({ Q1: 'Old.jpg' }, { Q1: cutout('https://tsdb/q1.png', null) })['Q1']).toBeUndefined();
    expect(portraitUrls({ Q1: 'Old.jpg' }, { Q1: cutout('https://tsdb/q1.png') })['Q1']).toBeUndefined();
  });
});

describe('portraitUrls in development', () => {
  const dev = (i: Record<string, string>, p: Record<string, PortraitRecord>) => portraitUrls(i, p, 200, true);

  it('keeps the Commons photo for a player the resolver has not reached', () => {
    // Mid-migration the board must not empty out: an unresolved player falls
    // back to exactly what it showed before portraits existed.
    const out = dev({ Q1: 'Old.jpg' }, {});
    expect(out['Q1']).toEqual({ url: commonsThumb('Old.jpg', 200), fit: 'cover' });
  });

  it('prefers a cutout over the photo we already held', () => {
    const out = dev({ Q1: 'Old.jpg' }, { Q1: cutout('https://tsdb/q1.png') });
    expect(out['Q1']?.url).toBe('https://tsdb/q1.png');
  });

  it('drops the card photo when the resolver found nothing usable', () => {
    // The point of the whole exercise. 31% of the photos in images.json were
    // taken after the player retired, so falling back to one shows a pundit in
    // a suit. No photo is the honest answer.
    const out = dev(
      { Q1: 'RetiredPundit.jpg' },
      { Q1: none('only photo is from 2019, career 1994-2006') },
    );
    expect(out['Q1']).toBeUndefined();
  });

  it('takes an in-era Commons photo the resolver picked over the stored one', () => {
    const out = dev({ Q1: 'Wrong.jpg' }, { Q1: commons('https://commons/Right.jpg', 2003) });
    expect(out['Q1']?.url).toBe('https://commons/Right.jpg');
  });

  it('carries a resolved player who had no stored photo at all', () => {
    expect(dev({}, { Q1: cutout('https://tsdb/q1.png') })['Q1']?.url).toBe('https://tsdb/q1.png');
  });

  it('ignores a resolved record that claims a source but carries no url', () => {
    // Defensive: a half-written record must not produce src="undefined".
    const out = dev({ Q1: 'Old.jpg' }, { Q1: { source: 'cutout' } });
    expect(out['Q1']).toBeUndefined();
  });

  it('encodes a filename that would otherwise break the URL', () => {
    expect(commonsThumb('A player (2003).jpg', 200)).toContain('A%20player%20(2003).jpg');
  });

  it('shows a cutout whole and crops a press photo', () => {
    // Getting this backwards is not cosmetic. A cutout cropped to a portrait
    // frame beheads the player; a press photo shown whole letterboxes inside
    // its mount with the face a quarter of the height.
    const out = dev(
      { Q2: 'Press.jpg' },
      { Q1: cutout('https://tsdb/q1.png'), Q3: commons('https://commons/x.jpg', 2003) },
    );
    expect(out['Q1']?.fit).toBe('contain');
    expect(out['Q2']?.fit).toBe('cover');
    expect(out['Q3']?.fit).toBe('cover');
  });
});
