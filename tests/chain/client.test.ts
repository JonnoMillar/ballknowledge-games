import { describe, it, expect } from 'vitest';
import { encodePicture, decodePicture, decodeNames } from '../../src/lib/chain/client';

describe('the album index over the wire', () => {
  it('round-trips a Commons photo and a cutout', () => {
    const commons = { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nguemo.jpg?width=200', fit: 'cover' as const };
    const cutout = { url: 'https://r2.thesportsdb.com/images/media/player/cutout/xv13mf1715781530.png', fit: 'contain' as const };
    expect(decodePicture(encodePicture(commons))).toEqual(commons);
    expect(decodePicture(encodePicture(cutout))).toEqual(cutout);
    expect(encodePicture(commons)!.length).toBeLessThan(commons.url.length / 2);
  });

  it('keeps an unfamiliar URL whole, with its fit', () => {
    const other = { url: 'https://example.org/a.png', fit: 'contain' as const };
    expect(decodePicture(encodePicture(other))).toEqual(other);
  });

  it('decodes a row with no picture to no image', () => {
    const [e] = decodeNames([['Q1', 'Someone', [], null]]);
    expect(e).toEqual({ id: 'Q1', name: 'Someone', aliases: [], image: undefined });
    expect(decodePicture(null)).toBeUndefined();
  });
});
