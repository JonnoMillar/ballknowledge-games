// Everyone in the pool who might get a photo, most-viewed first (English Wikipedia views,
// data/player-views.json; players with no views count go last, by fame). Writes <out> for
// candidates.py and cutout.py. Usage: npx tsx scripts/photos/pick-all.ts <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { clubColour, signatureClub } from '../../src/lib/club-colours';
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8'));
const clubs = JSON.parse(readFileSync('data/clubs.json', 'utf8'));
const views: Record<string, number> = JSON.parse(readFileSync('data/player-views.json', 'utf8'));
const out = pool
  .sort((a: any, b: any) => (views[b.id] ?? 0) - (views[a.id] ?? 0) || b.fame.value - a.fame.value)
  .map((p: any) => {
    const c = signatureClub(p);
    return { id: p.id, name: p.name, fame: p.fame.value, views: views[p.id] ?? 0, club: c, clubName: (clubs[c!] ?? clubs.clubs?.[c!])?.name, colour: clubColour(c) };
  });
writeFileSync(process.argv[2]!, JSON.stringify(out));
console.log(out.length, 'players,', out.filter((p: any) => p.views).length, 'with views');
