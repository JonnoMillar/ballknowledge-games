// ITK prototype picker (v5). Scratch-quality, kept for the generator rewrite.
// Usage: node scripts/itk/pick-examples.mjs data/itk/enwiki-views.json 500000 300000 25 [--write]
// Args: views file, player min enwiki views (24 months), club "known" min views, giant-club count.
// v2: knownness from enwiki pageviews; fakes known but not giant; ramp by believability.
import fs from 'node:fs';
const [VIEWS, P_MIN, C_KNOWN, GIANTS, WRITE] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], process.argv.includes('--write')];
const RAWV = JSON.parse(fs.readFileSync(VIEWS,'utf8'));
const RED = JSON.parse(fs.readFileSync(VIEWS.replace(/\.json$/,'.redirects.json'),'utf8'));
const V = new Proxy({}, { get: (_, t) => RAWV[RED[t] ?? t] });
const pool = JSON.parse(fs.readFileSync('data/pool.json','utf8'));
const car = JSON.parse(fs.readFileSync('data/careers.json','utf8')).players;
const clubs = JSON.parse(fs.readFileSync('data/clubs.json','utf8'));
const RES = /\s(B|C|II|III)$|\b(U-?\d+|Sub-?\d+|Reserves?|Youth|Academy|Primavera|Juvenil|Juniors?|Castilla|Atl[eè]tic|Mestalla|Jong|Amateure|Promesas)\b|Sevilla Atl[eé]tico|Bilbao Athletic/i;
const name = q => clubs[q]?.name ?? q;
const isRes = q => RES.test(name(q));
let rnd = 0x1234567; const rand=()=>{ rnd=(Math.imul(rnd^(rnd>>>15),0x2c1b3c6d)^0x297a2d39)>>>0; return rnd/4294967296; };
// club views: by q, from any stint title seen
const cv = new Map();
for (const p of Object.values(car)) for (const s of p?.stints||[]) if (s.q && s.title && V[s.title]!=null) cv.set(s.q, Math.max(cv.get(s.q)||0, V[s.title]));
const giants = new Set([...cv].sort((a,b)=>b[1]-a[1]).slice(0, GIANTS).map(([q])=>q));
const plN=new Map(), totN=new Map();
for (const p of pool){ const isPL=p.leagueIds.includes('Q9448'); for(const c of new Set(p.clubIds)){ totN.set(c,(totN.get(c)||0)+1); if(isPL) plN.set(c,(plN.get(c)||0)+1);} }
const plShare = q => (plN.get(q)||0)/(totN.get(q)||1);
/** Known to a British fan: well read and English-linked, or simply huge. */
const known = q => { const v=cv.get(q)||0; return (v >= C_KNOWN && plShare(q) >= 0.3) || v >= 2e6; };
const CAR = new Map();
for (const p of pool) {
  const c = car[p.id]; if (!c || (V[c.title]??0) < P_MIN) continue;
  const all0 = (c.stints||[]).filter(s=>s.q && !RES.test(s.title||'') && !isRes(s.q));
  // A club he never played for still belongs on the path if he was loaned out from it.
  const isParent = s => all0.some(t => t.loan && t.q !== s.q && t.from >= s.from && t.from <= s.to);
  const raw = all0.filter(s=>(s.apps??0)>0 || (!s.loan && isParent(s)));
  // A loan sits inside its parent spell; if the parent runs on past it, the player went back. Show that.
  const seq=[]; let parent=null;
  raw.forEach((s,i)=>{ seq.push(s); if(!s.loan){ parent=s; return; }
    const nx=raw[i+1];
    if(parent && parent.to>s.to && !(nx && nx.from<=s.to && nx.loan)) seq.push({...parent, from:s.to, loan:false, apps:0, ret:true}); });
  const st=[]; for (const s of seq){ const last=st[st.length-1]; if(last && last.q===s.q){ last.apps+=s.apps; last.loan=last.loan&&s.loan; continue;} st.push({q:s.q,from:s.from,loan:!!s.loan,apps:s.apps,ret:!!s.ret}); }
  if (st.length<4 || st.length>9 || st.some(s=>!clubs[s.q]?.crestUrl)) continue;
  // The audience's own memory: careers centred on 2005 or later, still going in 2012.
  const yrs=st.map(s=>s.from).sort((a,b)=>a-b);
  if (yrs[0] < 2004 || yrs[yrs.length>>1] < 2008 || yrs[yrs.length-1] < 2015) continue;
  if (st.filter(s=>!known(s.q)).length > 1) continue;
  const all = new Set((c.stints||[]).map(s=>s.q));
  if (p.clubIds.some(x=>!all.has(x) && !isRes(x))) continue;
  CAR.set(p.id, st);
}
const out=new Map(), inn=new Map(), size=new Map(), era=new Map();
const inc=(m,a,b)=>{ if(!m.has(a)) m.set(a,new Map()); m.get(a).set(b,(m.get(a).get(b)||0)+1); };
for (const p of pool){ const st=(car[p.id]?.stints||[]).filter(s=>s.q&&!isRes(s.q)&&(s.apps??0)>0);
  for(let i=0;i<st.length-1;i++) if(st[i].q!==st[i+1].q){ inc(out,st[i].q,st[i+1].q); inc(inn,st[i+1].q,st[i].q); }
  for(const q of new Set(st.map(s=>s.q))) size.set(q,(size.get(q)||0)+1);
  for(const s of st){ const k=s.q+'@'+Math.floor(s.from/5); if(!era.has(k)) era.set(k,[]); era.get(k).push(p.fame.value);} }
const med = a => { const b=[...a].sort((x,y)=>x-y); return b[Math.floor(b.length/2)]; };
const strength = (q,y) => { const a=era.get(q+'@'+Math.floor(y/5)); return a&&a.length>=3?med(a):null; };
const loanRate = 0.15;
// ── v5: swap or insert, a different kind of fake each round, photo guard, ordered by difficulty ──
const UA = 'ChainFootballGame/0.1 (jonno@m1llar.com) prototype-research';
const imgs = JSON.parse(fs.readFileSync('data/images.json','utf8'));
async function photoYear(id){
  const f = imgs[id]; if (!f) return null;
  const m = f.match(/(?:19|20)\d\d/); if (m) return +m[0];
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=' + encodeURIComponent('File:' + f);
  const j = await fetch(url, { headers: { 'user-agent': UA } }).then(r => r.json()).catch(() => null);
  const pg = j && Object.values(j.query?.pages || {})[0];
  const d = String(pg?.imageinfo?.[0]?.extmetadata?.DateTimeOriginal?.value || '');
  const y = d.match(/(?:19|20)\d\d/); return y ? +y[0] : null;
}
const usedFakes = new Set();
// Who started at each club in each year: a fake must be a club real players were joining around then.
const starts = new Map();
for (const p of pool) for (const s of (car[p.id]?.stints||[])) if (s.q && (s.apps??0)>0) { const k=s.q; if(!starts.has(k)) starts.set(k,[]); starts.get(k).push(s.from); }
const activeAt = (c, y) => (starts.get(c)||[]).filter(x => Math.abs(x - y) <= 2).length >= 4;
function clubOK(c, own, cap){ return !own.has(c) && !usedFakes.has(c) && (cv.get(c)||0) <= cap && !isRes(c) && !giants.has(c) && known(c) && clubs[c]?.crestUrl && (size.get(c)||0) >= 8; }
function options(p, st, py){
  const apps=new Map(), count=new Map();
  for (const s of st){ apps.set(s.q,(apps.get(s.q)||0)+s.apps); count.set(s.q,(count.get(s.q)||0)+1); }
  const sig=[...apps].sort((a,b)=>b[1]-a[1])[0][0];
  const own=new Set([...p.clubIds,...(car[p.id]?.stints||[]).map(s=>s.q)]);
  const cap=med(st.map(s=>cv.get(s.q)||0));
  const n=st.length, opts=[];
  const score=(c, A, B, y, ref)=>{
    const sc=strength(c,y); if (sc==null) return null;
    const sr=ref ?? sc;
    const fa=A?(out.get(A.q)?.get(c)||0):0, fb=B?(inn.get(B.q)?.get(c)||0):0;
    if (fa+fb<2) return null;
    const tier=1-Math.min(1,Math.abs(sc-sr)/Math.max(sc,sr,1));
    return { s:(fa+fb)/Math.sqrt(size.get(c))*tier*tier*(fa>0&&fb>0?2:1), both:fa>0&&fb>0 };
  };
  // Swap: the fake stands in for a real stop.
  for (let i=1;i<n;i++){
    const X=st[i], A=st[i-1], B=st[i+1];
    // Never the club he is known for, a famous club, or any real spell (50+ games): fans remember those.
    if (X.q===sig || (cv.get(X.q)||0)>=8e6 || (apps.get(X.q)||0)>=50) continue;
    // The photo is from somewhere: never swap out the spell it was taken in.
    if (py!=null && py>=X.from && (!B || py<B.from)) continue;
    const type = count.get(X.q)>1 || X.ret ? 'return' : X.loan ? 'loan' : i>=n*0.7 ? 'late' : 'mid';
    const xv=cv.get(X.q)||0;
    for (const c of new Set([...(out.get(A.q)?.keys()||[]),...(B?(inn.get(B.q)?.keys()||[]):[])])){
      if (!clubOK(c, own, cap) || !activeAt(c, X.from)) continue;
      const v=cv.get(c)||0; if (xv>0 && (v>xv*3||v<xv/3)) continue;
      const r=score(c,A,B,X.from,strength(X.q,X.from)); if(!r) continue;
      opts.push({ mode:'swap', type, i, c, year:X.from, loan:X.loan, real:X.q, ...r });
    }
  }
  // Insert: a move that never happened, between two real ones.
  for (let i=0;i<n-1;i++){
    const A=st[i], B=st[i+1];
    if ((cv.get(A.q)||0)>=8e6 && (cv.get(B.q)||0)>=8e6) continue;
    const y = B.from-A.from>=2 ? A.from+1+Math.floor((B.from-A.from-1)/2) : B.from;
    for (const c of new Set([...(out.get(A.q)?.keys()||[]),...(inn.get(B.q)?.keys()||[])])){
      if (!clubOK(c, own, cap) || !activeAt(c, y)) continue;
      const sa=strength(A.q,A.from), sb=strength(B.q,B.from);
      const r=score(c,A,B,y,sa!=null&&sb!=null?(sa+sb)/2:null); if(!r) continue;
      opts.push({ mode:'insert', type:'insert', i:i+1, c, year:y, loan: rand()<loanRate, ...r });
    }
  }
  const best=new Map(); for (const o of opts.sort((a,b)=>b.s-a.s)) if (!best.has(o.type)) best.set(o.type,o);
  return best;
}
const vw=id=>V[car[id].title]||0;
const ids=[...CAR.keys()].sort();
const shuffle=a=>{ const x=[...a]; for(let i=x.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } return x; };
const buckets=[[2e6,5e6,1],[1e6,2e6,2],[5e5,1e6,2]];
// Already played in earlier rounds of the playtest: fresh careers only.
const PLAYED = new Set(['Cristiano Ronaldo','Luka Modrić','Sergio Ramos','Juan Mata','David Silva','Michael Carrick','Enner Valencia','Daley Blind','Ederson','James McCarthy','Harry Winks','Ján Mucha','Charlie Adam','Facundo Pellistri','Kevin Doyle',
 'Roy Keane','Toni Kroos','Gary Lineker','Wojciech Szczęsny','Thibaut Courtois','Danny Welbeck','Kieran Trippier','Gabriel Jesus','Amadou Onana','Glenn Hoddle','Sean Dyche','Gary Speed','Donny van de Beek','Kolo Touré',
 'İlkay Gündoğan','João Félix','Wayne Rooney','Xavi Simons','Mauro Icardi','Christopher Nkunku','Marc-André ter Stegen','Marc Guiu Paz','Ezri Konsa','Conor Gallagher','Joey Barton','Dean Henderson','Brennan Johnson','Joe Cole','Conor Coady',
 'Harry Maguire','Raheem Sterling','Eberechi Eze','Theo Walcott','Jack Grealish','Rafael Leão','Ashley Young','Jordan Henderson','Antoine Semenyo','Tom Cleverley','Adrien Rabiot','Kingsley Coman','Jonathan David']);
const usedP=new Set(pool.filter(p=>PLAYED.has(p.name)).map(p=>p.id)); const sets=[]; const lines=[], keys=[];
for (let si=0; si<3; si++){
  let pick=[];
  for (const [lo,hi,k] of buckets) pick.push(...shuffle(ids.filter(id=>vw(id)>=lo&&vw(id)<hi&&!usedP.has(id))).slice(0,k*15));
  // Build the five: distinct fake kinds, an insert at least once, a journeyman somewhere.
  const chosen=[], kinds=new Set();
  const take=async (id, forceType)=>{
    const p=pool.find(x=>x.id===id), st=CAR.get(id);
    const opts=options(p, st, await photoYear(id));
    const short = st.length<=5;
    // A short career gets an insert more often than not, never always: a fixed rule is a tell.
    const order = forceType ? [forceType] : short && rand()<0.6 ? ['insert', ...shuffle(['loan','mid','late','return'])] : shuffle(['loan','mid','late','return','insert']);
    for (const t of order){ if (kinds.has(t)) continue; const o=opts.get(t); if (!o) continue; kinds.add(t); usedFakes.add(o.c); usedP.add(id); chosen.push({ id, p, st, o }); return true; }
    return false;
  };
  for (const [lo,hi,k] of buckets){ let got=0; for (const id of pick.filter(id=>vw(id)>=lo&&vw(id)<hi)){ if (got>=k) break; if (!usedP.has(id) && await take(id)) got++; } }
  if (!chosen.some(c=>c.st.length>=7)){ // swap the weakest bucket pick for a journeyman
    const j=shuffle(ids.filter(id=>!usedP.has(id)&&CAR.get(id).length>=7&&vw(id)>=6e5));
    const drop=chosen.pop(); kinds.delete(drop.o.type); usedFakes.delete(drop.o.c); usedP.delete(drop.id);
    for (const id of j) if (await take(id)) break;
  }
  if (!kinds.has('insert')){ for (const c of [...chosen].reverse()){ const opts=options(c.p,c.st,null); const o=opts.get('insert'); if(o){ kinds.delete(c.o.type); usedFakes.delete(c.o.c); usedFakes.add(o.c); c.o=o; kinds.add('insert'); break; } } }
  // Easy to hard: fame first, then how hidden the fake is.
  const diff=c=>-Math.log10(vw(c.id)) + (c.o.mode==='insert'?0.35:0) + (['loan','return'].includes(c.o.type)?0.25:0) + (c.st.length>=7?0.15:0) + (c.o.both?0.2:0);
  chosen.sort((a,b)=>diff(a)-diff(b));
  sets.push({ id:'ABC'[si], picker:'v5', rounds: chosen.map(c=>{
    const stops=c.st.map(s=>({club:s.q,year:s.from,loan:s.loan}));
    const fake={club:c.o.c,year:c.o.year,loan:c.o.loan};
    if (c.o.mode==='swap') stops[c.o.i]=fake; else stops.splice(c.o.i,0,fake);
    const tag=`${c.o.mode} · ${c.o.type}${c.st.length>=7?' · journeyman':''}`;
    lines.push(`${'ABC'[si]}. ${c.p.name} (${Math.round(vw(c.id)/1000)}k) [${tag}] — ${stops.map(s=>name(s.club).replace(/ F\.C\.| A\.F\.C\./,'')+' '+s.year+(s.loan?' (loan)':'')).join(' → ')}`);
    keys.push(`${'ABC'[si]}. ${c.p.name}: fake ${name(c.o.c)}${c.o.real?' in place of '+name(c.o.real):' (inserted)'}`);
    return { band:tag, player:c.id, name:car[c.id].title.replace(/\s*\(.*\)$/,''), mode:c.o.mode, stops, fake:c.o.i, real:c.o.real };
  }) });
}
console.log(lines.join('\n')); console.log('--- answers'); console.log(keys.join('\n'));
if (WRITE) fs.writeFileSync('content/itk/examples.json', JSON.stringify({ note:'Prototype examples v5 (swap or insert, varied fake kinds, photo guard, ordered by difficulty), for critique. Not generator output.', sets }, null, 1));
