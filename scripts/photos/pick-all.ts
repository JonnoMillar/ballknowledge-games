// Everyone who gets a photo: fame 60+, plus every player a shipped board can show (data/portraits.json),
// famous first. Writes <out> for candidates.py. Usage: npx tsx scripts/photos/pick-all.ts <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { clubColour, signatureClub } from '../../src/lib/club-colours';
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8'));
const clubs = JSON.parse(readFileSync('data/clubs.json', 'utf8'));
const onBoards = new Set(Object.keys(JSON.parse(readFileSync('data/portraits.json', 'utf8'))));
const out = pool
  .filter((p: any) => p.fame.value >= 60 || onBoards.has(p.id))
  .sort((a: any, b: any) => b.fame.value - a.fame.value)
  .map((p: any) => {
    const c = signatureClub(p);
    return { id: p.id, name: p.name, fame: p.fame.value, club: c, clubName: (clubs[c!] ?? clubs.clubs?.[c!])?.name, colour: clubColour(c) };
  });
writeFileSync(process.argv[2]!, JSON.stringify(out));
console.log(out.length, 'players,', out.filter((p: any) => p.fame >= 60).length, 'fame 60+');
