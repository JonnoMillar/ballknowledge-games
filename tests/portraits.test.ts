import { describe, it, expect } from 'vitest';
import { commonsThumb, portraitUrls, type PortraitRecord } from '../src/lib/portraits';

const cutout = (url: string): PortraitRecord => ({ source: 'cutout', url });
const commons = (url: string, year: number): PortraitRecord => ({ source: 'commons', url, year });
const none = (reason: string): PortraitRecord => ({ source: 'none', reason });

describe('portraitUrls', () => {
  it('keeps the Commons photo for a player the resolver has not reached', () => {
    // Mid-migration the board must not empty out: an unresolved player falls
    // back to exactly what it showed before portraits existed.
    const out = portraitUrls({ Q1: 'Old.jpg' }, {});
    expect(out['Q1']).toBe(commonsThumb('Old.jpg', 200));
  });

  it('prefers a cutout over the photo we already held', () => {
    const out = portraitUrls({ Q1: 'Old.jpg' }, { Q1: cutout('https://tsdb/q1.png') });
    expect(out['Q1']).toBe('https://tsdb/q1.png');
  });

  it('drops the card photo when the resolver found nothing usable', () => {
    // The point of the whole exercise. 31% of the photos in images.json were
    // taken after the player retired, so falling back to one shows a pundit in
    // a suit. No photo is the honest answer.
    const out = portraitUrls(
      { Q1: 'RetiredPundit.jpg' },
      { Q1: none('only photo is from 2019, career 1994-2006') },
    );
    expect(out['Q1']).toBeUndefined();
  });

  it('takes an in-era Commons photo the resolver picked over the stored one', () => {
    const out = portraitUrls({ Q1: 'Wrong.jpg' }, { Q1: commons('https://commons/Right.jpg', 2003) });
    expect(out['Q1']).toBe('https://commons/Right.jpg');
  });

  it('carries a resolved player who had no stored photo at all', () => {
    expect(portraitUrls({}, { Q1: cutout('https://tsdb/q1.png') })['Q1']).toBe('https://tsdb/q1.png');
  });

  it('ignores a resolved record that claims a source but carries no url', () => {
    // Defensive: a half-written record must not produce src="undefined".
    const out = portraitUrls({ Q1: 'Old.jpg' }, { Q1: { source: 'cutout' } });
    expect(out['Q1']).toBeUndefined();
  });

  it('encodes a filename that would otherwise break the URL', () => {
    expect(commonsThumb('A player (2003).jpg', 200)).toContain('A%20player%20(2003).jpg');
  });
});
