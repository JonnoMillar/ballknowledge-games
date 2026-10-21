// Round 2 players: 30 famous names Jonno has not judged, mixed eras. Writes <out> for candidates.py.
// Usage: npx tsx scripts/photos/pick-round2.ts <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { clubColour, signatureClub } from '../../src/lib/club-colours';
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8'));
const clubs = JSON.parse(readFileSync('data/clubs.json', 'utf8'));
const IDS = [
  // retired, 1980s-2000s
  'Q17515', 'Q1835', 'Q10520', 'Q45901', 'Q67964', 'Q185389', 'Q41244', 'Q429039', 'Q483145', 'Q11576', 'Q131261', 'Q624', 'Q173972', 'Q45626',
  // retired, 2010s
  'Q41533', 'Q266613', 'Q459830', 'Q11584', 'Q17500', 'Q531814', 'Q43913',
  // playing now
  'Q142794', 'Q21621995', 'Q28967995', 'Q969725', 'Q113704154', 'Q28973866', 'Q439722', 'Q133903', 'Q66241169',
];
const out = IDS.map((id) => {
  const p = pool.find((x: any) => x.id === id);
  const c = signatureClub(p);
  return { id, name: p.name, club: c, clubName: (clubs[c!] ?? clubs.clubs?.[c!])?.name, colour: clubColour(c) };
});
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1));
console.log(out.length, out.map((o) => o.name).join(', '));
