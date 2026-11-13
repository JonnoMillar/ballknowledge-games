import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dealFor, dealLine, parseTransfers, type Deal } from '../../src/lib/transfers';

describe('reading a window page', () => {
  const rows = parseTransfers(readFileSync('tests/fixtures/transfers-summer-2023.txt', 'utf8'));
  it('reads priced moves only, with the date carried down a rowspan', () => {
    const rice = rows.find((r) => r.player === 'Declan Rice')!;
    expect(rice).toMatchObject({ title: 'Declan Rice', from: 'West Ham United', to: 'Arsenal', fee: 105_000_000 });
    expect(rice.date).toMatch(/^2023-07-\d\d$/);
    // Free, undisclosed and loans are not fees.
    expect(rows.every((r) => r.fee >= 2)).toBe(true);
    expect(rows.some((r) => r.player === 'Dion Sanderson')).toBe(false);
    expect(rows.some((r) => r.player === 'Andre Ayew' || r.player === 'André Ayew')).toBe(false);
  });
  it('takes the link title from a sortname dab', () => {
    const w = `{|\n!Date\n!Player\n!Moving from\n!Moving to\n!Fee\n|-\n| '''1 July 2020'''\n| {{sortname|Chris|Martin|dab=footballer, born 1988}}\n| [[Derby County F.C.|Derby County]]\n| [[Bristol City F.C.|Bristol City]]\n| {{ntsh|500000}}£500,000\n|}`;
    expect(parseTransfers(w)).toEqual([{ title: 'Chris Martin (footballer, born 1988)', player: 'Chris Martin', from: 'Derby County', to: 'Bristol City', fee: 500_000, date: '2020-07-01' }]);
  });
});

describe('the deal beside a report value', () => {
  const d = (player: string, fee: number, views: number, date = '2023-07-01'): Deal => ({ player, qid: player, from: 'A', to: 'Newcastle United', fee: fee * 1e6, date, views });
  const deals = [d('Barnes', 38, 2e6), d('Famous', 40, 9e6), d('Obscure', 37, 100_000), d('Old', 37, 9e6, '2008-07-01'), d('Rice', 105, 9e6)];
  it('prefers within 5%, then the best known; unknown and pre-2010 deals never show', () => {
    expect(dealFor(37.0, deals)?.deal.player).toBe('Barnes');
    expect(dealFor(39.8, deals)?.deal.player).toBe('Famous');
  });
  it('falls back to "More than" the dearest deal under the value, and nothing below every deal', () => {
    const more = dealFor(125, deals)!;
    expect(more).toMatchObject({ more: true, deal: { player: 'Rice' } });
    expect(dealLine(more)).toBe('More than Newcastle United paid for Rice');
    expect(dealFor(1, deals)).toBeNull();
  });
  it('the committed data covers nearly every value with a known deal', () => {
    const real = JSON.parse(readFileSync('data/transfers.json', 'utf8')) as Deal[];
    const values = Array.from({ length: 1001 }, (_, i) => 1.05 ** (i / 10));
    const near = values.filter((v) => dealFor(v, real) && !dealFor(v, real)!.more).length;
    expect(near).toBeGreaterThan(900);
  });
});
