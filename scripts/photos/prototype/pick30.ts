import { readFileSync, writeFileSync } from 'node:fs';
import { clubColour, signatureClub } from '../../src/lib/club-colours';
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8'));
const P = JSON.parse(readFileSync('data/portraits.json', 'utf8'));
const clubs = JSON.parse(readFileSync('data/clubs.json', 'utf8'));
const seen = new Set(JSON.parse(readFileSync('.scratch/photo-test/players.json', 'utf8')).slice(0, 12).map((p: any) => p.id));
const out: any[] = [];
for (const p of [...pool].sort((a: any, b: any) => b.fame.value - a.fame.value)) {
  if (seen.has(p.id) || !P[p.id]?.career) continue;
  const c = signatureClub(p);
  out.push({ id: p.id, name: p.name, club: c, clubName: (clubs[c!] ?? clubs.clubs?.[c!])?.name, colour: clubColour(c) });
  if (out.length === 30) break;
}
writeFileSync('.scratch/photo-test/round1.json', JSON.stringify(out, null, 1));
console.log(out.map((x) => `${x.name} (${P[x.id].career.join('-')})`).join(', '));
