import { readFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(a.length * p))] ?? 0;

const byClub = new Map<string, Player[]>();
const byNation = new Map<string, number>();
for (const p of pool) {
  for (const c of p.clubIds) {
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p);
  }
  byNation.set(p.nation, (byNation.get(p.nation) ?? 0) + 1);
}

const sizes = [...byClub.values()].map((v) => v.length);
console.log('=== POOL ===');
console.log(`players           ${pool.length}`);
console.log(`distinct clubs    ${byClub.size}`);
console.log(`distinct nations  ${byNation.size}`);
console.log(`clubs >=11 players ${sizes.filter((n) => n >= 11).length}   <- can anchor a full XI`);
console.log(`clubs >=25 players ${sizes.filter((n) => n >= 25).length}`);
console.log(`nations >=11       ${[...byNation.values()].filter((n) => n >= 11).length}`);

const f = pool.map((p) => p.fame.value).sort((a, b) => a - b);
console.log(`fame  min ${f[0]}  p25 ${pct(f, 0.25)}  med ${pct(f, 0.5)}  p75 ${pct(f, 0.75)}  max ${f[f.length - 1]}`);

console.log('\n=== FAME SPREAD IN THE 12 BIGGEST CLUBS ===');
console.log('club          n   min  p25  med  p75  max  deep<=30');
const top = [...byClub.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12);
for (const [qid, players] of top) {
  const v = players.map((p) => p.fame.value).sort((a, b) => a - b);
  console.log(
    qid.padEnd(12), String(players.length).padStart(4),
    String(v[0]).padStart(5), String(pct(v, 0.25)).padStart(4),
    String(pct(v, 0.5)).padStart(4), String(pct(v, 0.75)).padStart(4),
    String(v[v.length - 1]).padStart(5),
    String(players.filter((p) => p.fame.value <= 30).length).padStart(9),
  );
}
