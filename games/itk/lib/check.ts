import { daysBetween, fakeClub, FAKE_COOLDOWN, ROUNDS, type StoredDay } from './day';
import type { World } from './world';

/**
 * The promises a day makes, checked against the schedule before it. Used by
 * the tests on the committed schedule and on a year generated from scratch.
 * Returns what is broken; empty means the day is sound.
 */
export function problems(w: World, day: StoredDay, before: readonly StoredDay[]): string[] {
  const out: string[] = [];
  const say = (s: string) => out.push(`${day.date}: ${s}`);
  const floor = day.floor;
  if (day.rounds.length !== ROUNDS) say(`${day.rounds.length} rounds`);
  if (new Set(day.rounds.map((r) => r.player)).size !== day.rounds.length) say('a player twice');
  if (new Set(day.rounds.map(fakeClub)).size !== day.rounds.length) say('a fake club twice');
  for (const r of day.rounds) {
    if (r.fake < 0 || r.fake >= r.stops.length) { say(`${r.name}: fake index ${r.fake}`); continue; }
    if (w.owned(r.player).has(fakeClub(r))) say(`${r.name}: fake ${fakeClub(r)} is a club he played for`);
    if ((r.mode === 'swap') !== (r.real != null)) say(`${r.name}: a swap names the club it covered, an insert does not`);
    for (const d of before) {
      const gap = daysBetween(d.date, day.date);
      for (const p of d.rounds) {
        if (p.player === r.player && gap < floor) say(`${r.name} again after ${gap} days (floor ${floor})`);
        if (p.player === r.player && fakeClub(p) === fakeClub(r)) say(`${r.name}: same fake ${fakeClub(r)} as ${d.date}`);
        if (fakeClub(p) === fakeClub(r) && gap <= FAKE_COOLDOWN) say(`fake ${fakeClub(r)} used ${gap} days ago`);
      }
    }
  }
  return out;
}
