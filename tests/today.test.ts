import { describe, it, expect } from 'vitest';
import { readHubCookie } from '../src/lib/today';

const cookie = (v: object) => encodeURIComponent(JSON.stringify(v));

describe("the hub's cookie", () => {
  // 23:30 UTC on the 14th is already the 15th in Sydney.
  const now = new Date('2026-10-14T23:30:00Z');

  it('counts only when written on the browser’s own today', () => {
    const v = { date: '2026-10-15', tz: 'Australia/Sydney', done: ['spoofed', 'chain'], streak: 3 };
    expect(readHubCookie(cookie(v), now)).toEqual({ done: ['chain', 'spoofed'], streak: 3 });
    expect(readHubCookie(cookie({ ...v, tz: 'America/New_York' }), now).done).toEqual([]);
    expect(readHubCookie(cookie({ ...v, date: '2026-10-14' }), now).done).toEqual([]);
  });

  it('reads anything else as nothing done', () => {
    for (const raw of [undefined, '', 'nope', cookie({ date: '2026-10-15', tz: 'Not/AZone', done: [], streak: 1 }), cookie({ tz: 'UTC' })]) {
      expect(readHubCookie(raw, now)).toEqual({ done: [], streak: 0 });
    }
  });
});
