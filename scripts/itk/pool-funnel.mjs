// ITK eligible-pool funnel: how many players survive each rule. Scratch quality.
// Usage: node scripts/itk/pool-funnel.mjs . PMIN CKNOWN FIRST MEDIAN PLSHARE UNKNOWN MAXSTOPS x BIG   (last two optional; "x" prints the clubs that cost players)
// Baseline v5 rules: . 500000 300000 2004 2008 0.3 1 9 - 2000000  -> 125 players.
import fs from 'node:fs';
process.chdir(process.argv[2]);
const VIEWS='data/itk/enwiki-views.json', P_MIN=+process.argv[3]||500000, C_KNOWN=+process.argv[4]||300000, FIRST=+process.argv[5]||2004, MEDIAN=+process.argv[6]||2008, SHARE=+(process.argv[7]??0.3), UNK=+(process.argv[8]??1), MAXN=+(process.argv[9]||9);
const RAWV=JSON.parse(fs.readFileSync(VIEWS,'utf8')), RED=JSON.parse(fs.readFileSync(VIEWS.replace(/\.json$/,'.redirects.json'),'utf8'));
const V=new Proxy({}, {get:(_,t)=>RAWV[RED[t]??t]});
const pool=JSON.parse(fs.readFileSync('data/pool.json','utf8'));
const car=JSON.parse(fs.readFileSync('data/careers.json','utf8')).players;
const clubs=JSON.parse(fs.readFileSync('data/clubs.json','utf8'));
const RES=/\s(B|C|II|III)$|\b(U-?\d+|Sub-?\d+|Reserves?|Youth|Academy|Primavera|Juvenil|Juniors?|Castilla|Atl[eè]tic|Mestalla|Jong|Amateure|Promesas)\b|Sevilla Atl[eé]tico|Bilbao Athletic/i;
const name=q=>clubs[q]?.name??q, isRes=q=>RES.test(name(q));
const cv=new Map();
for (const p of Object.values(car)) for (const s of p?.stints||[]) if (s.q&&s.title&&V[s.title]!=null) cv.set(s.q,Math.max(cv.get(s.q)||0,V[s.title]));
const plN=new Map(), totN=new Map();
for (const p of pool){ const isPL=p.leagueIds.includes('Q9448'); for(const c of new Set(p.clubIds)){ totN.set(c,(totN.get(c)||0)+1); if(isPL) plN.set(c,(plN.get(c)||0)+1);} }
const plShare=q=>(plN.get(q)||0)/(totN.get(q)||1);
const known=q=>{const v=cv.get(q)||0; return (v>=C_KNOWN&&plShare(q)>=SHARE)||v>=(+process.argv[11]||2e6);};
const U={};const R={};const bump=k=>R[k]=(R[k]||0)+1;
const surv={}; let ok=[];
const order=['pool','has career','views>=min','stints 4-9 w/ crests','era (first>=2004,median>=2008,last>=2015)','<=1 unknown club','no unexplained club','PASS'];
const pass=Object.fromEntries(order.map(k=>[k,0]));
for (const p of pool){ pass.pool++;
  const c=car[p.id]; if(!c) {continue;} pass['has career']++;
  if((V[c.title]??0)<P_MIN) continue; pass['views>=min']++;
  const all0=(c.stints||[]).filter(s=>s.q&&!RES.test(s.title||'')&&!isRes(s.q));
  const isParent=s=>all0.some(t=>t.loan&&t.q!==s.q&&t.from>=s.from&&t.from<=s.to);
  const raw=all0.filter(s=>(s.apps??0)>0||(!s.loan&&isParent(s)));
  const seq=[];let parent=null;
  raw.forEach((s,i)=>{seq.push(s);if(!s.loan){parent=s;return;}const nx=raw[i+1];if(parent&&parent.to>s.to&&!(nx&&nx.from<=s.to&&nx.loan))seq.push({...parent,from:s.to,loan:false,apps:0,ret:true});});
  const st=[];for(const s of seq){const last=st[st.length-1];if(last&&last.q===s.q){last.apps+=s.apps;last.loan=last.loan&&s.loan;continue;}st.push({q:s.q,from:s.from,loan:!!s.loan,apps:s.apps});}
  if(st.length<4||st.length>MAXN||st.some(s=>!clubs[s.q]?.crestUrl)){ R.lenOrCrest=(R.lenOrCrest||0)+1; (st.length<4?bump('  too few stops (<4)'):st.length>MAXN?bump('  too many (>9)'):bump('  a club lacks crest')); continue;}
  pass['stints 4-9 w/ crests']++;
  const yrs=st.map(s=>s.from).sort((a,b)=>a-b);
  if(yrs[0]<FIRST) bump('  era: first stop <2004'); else if(yrs[yrs.length>>1]<MEDIAN) bump('  era: median <2008'); else if(yrs[yrs.length-1]<2015) bump('  era: last <2015');
  if(yrs[0]<FIRST||yrs[yrs.length>>1]<MEDIAN||yrs[yrs.length-1]<2015) continue;
  pass['era (first>=2004,median>=2008,last>=2015)']++;
  if(st.filter(s=>!known(s.q)).length>UNK){bump('  >UNK unknown club'); for(const s of st) if(!known(s.q)) U[name(s.q)]=(U[name(s.q)]||0)+1; continue;}
  pass['<=1 unknown club']++;
  const all=new Set((c.stints||[]).map(s=>s.q));
  if(p.clubIds.some(x=>!all.has(x)&&!isRes(x))){bump('  unexplained club');continue;}
  pass['no unexplained club']++; pass.PASS++;
}
console.log('MIN views',P_MIN); console.log(pass); console.log(R);
// careers coverage
const withCar=pool.filter(p=>car[p.id]).length; const withViews=pool.filter(p=>car[p.id]&&V[car[p.id].title]!=null).length;
console.log({pool:pool.length,withCareer:withCar,withViewsRow:withViews, viewsRows:Object.keys(RAWV).length});
const vs=pool.filter(p=>car[p.id]).map(p=>V[car[p.id].title]??0).sort((a,b)=>b-a);
console.log('views quantiles of career players: n>=500k',vs.filter(v=>v>=5e5).length,' n>=200k',vs.filter(v=>v>=2e5).length,' n>=100k',vs.filter(v=>v>=1e5).length,' n>=50k',vs.filter(v=>v>=5e4).length);

if(process.argv[10]) console.log('unknown clubs among rejected:', Object.entries(U).sort((a,b)=>b[1]-a[1]).slice(0,45).map(([n,c])=>n+' '+c).join(', '));
