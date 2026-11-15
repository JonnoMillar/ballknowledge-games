import { describe, it, expect } from 'vitest';
import { commonsThumb, kitCard, portraitUrls, type PortraitRecord } from '../src/lib/portraits';

const cutout = (url: string): PortraitRecord => ({ source: 'cutout', url });
const commons = (url: string, year: number): PortraitRecord => ({ source: 'commons', url, year });
const none = (reason: string): PortraitRecord => ({ source: 'none', reason });
const processed = (id: string): PortraitRecord => ({ source: 'processed', url: `/portraits/${id}.webp`, file: 'Some photo.jpg', year: 2012 });

describe('portraitUrls in public', () => {
  // TheSportsDB cutouts carry no strCreativeCommons flag, and its terms say
  // such artwork must not be used publicly. Public is the default.
  it('never shows a TheSportsDB cutout', () => {
    expect(portraitUrls({ Q1: cutout('https://tsdb/q1.png') })['Q1']).toBeUndefined();
  });

  it('shows our own processed cutout in the box', () => {
    expect(portraitUrls({ Q1: processed('Q1') })['Q1']).toEqual({ url: '/portraits/Q1.webp', fit: 'box' });
  });

  it('gives every other kind of record to the kit card, not an unchecked photo', () => {
    // Jonno, 2026-10-29: a player with no usable photo gets the kit card, not the old
    // unjudged Commons photo (31% of those were taken after the player retired).
    const out = portraitUrls({ Q1: commons('https://commons/x.jpg', 2003), Q2: none('only photo is from 2019'), Q3: { source: 'processed' } });
    expect(out).toEqual({});
  });
});

describe('portraitUrls in development', () => {
  const dev = (p: Record<string, PortraitRecord>) => portraitUrls(p, true);

  it('shows a TheSportsDB cutout whole', () => {
    expect(dev({ Q1: cutout('https://tsdb/q1.png') })['Q1']).toEqual({ url: 'https://tsdb/q1.png', fit: 'contain' });
  });

  it('prefers nothing over a record that claims a source but carries no url', () => {
    // Defensive: a half-written record must not produce src="undefined".
    expect(dev({ Q1: { source: 'cutout' } })['Q1']).toBeUndefined();
  });

  it('still never shows an unchecked Commons photo', () => {
    expect(dev({ Q1: commons('https://commons/x.jpg', 2003) })['Q1']).toBeUndefined();
  });

  it('encodes a filename that would otherwise break the URL', () => {
    expect(commonsThumb('A player (2003).jpg', 200)).toContain('A%20player%20(2003).jpg');
  });
});

describe('the kit card', () => {
  it('carries the club for the crest', () => {
    expect(kitCard('Q9')).toEqual({ url: '', fit: 'kit', club: 'Q9' });
    expect(kitCard(undefined)).toEqual({ url: '', fit: 'kit' });
  });
});
