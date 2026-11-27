"""The next review batch: the best-known players with no checked photo, plus re-picks for soft published ones.

Usage: python gap_batch.py <dir> [--n 150] [--repick Q1,Q2] [--dry]   (stop the watchdog first; run redo_marked.py first)
       python gap_batch.py <dir> --finish                        (after candidates.py and cutout.py ran on gaps-redo.json)

A gap is a pool player whose data/portraits.json record is not `processed` and whom Jonno has not already approved
or picked. They are ranked by English Wikipedia views, a player whose career ended before 2015 (and who is not a
manager) counted at 40%: the audience is 16-26 (docs/photo-pipeline.md, 2026-11-17). The top N go in
focus-gaps.json, which /photo-check?focus=gaps and /photo-pick?focus=gaps show on their own. For each:
  - a cutout waiting for review stays, unless it is under the sharpness floor: then its file is banned and the
    next candidate is cut;
  - on the kit card, or marked wrong with fewer than three sharp alternatives, or never searched: candidates and
    cutouts move to old/ and the player is searched again with the current rules (gaps-redo.json);
  - a re-pick (--repick, already published): its file is banned, it joins marked.json for three alternatives, and
    --finish puts the published cutout back as alternative 0, so it stays approved and ships unless he picks another.
"""
import json, shutil, sys
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
PHOTOS = HERE.parent if (HERE.parent / 'rank.py').exists() else HERE.parents[2] / 'scripts' / 'photos'
sys.path.insert(0, str(PHOTOS))
import rank, checks

D = Path(sys.argv[1])
ROOT = PHOTOS.parents[1]
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
N = int(arg('--n', 150))
RECENT, OLD_WEIGHT = 2015, 0.4

def load(name, empty):
    f = D / name
    return json.loads(f.read_text(encoding='utf8')) if f.exists() else empty

def save(name, v):
    (D / name).write_text(json.dumps(v, ensure_ascii=False), encoding='utf8')

def sharp_ok(pid, k):
    w = D / 'out' / f'{pid}.{k}.webp'
    return w.exists() and checks.subject_sharpness(np.array(Image.open(w).convert('RGBA'))) >= checks.MIN_SUBJECT_SHARP

def ban(pid, files):
    f = D / 'bad' / f'{pid}.json'
    f.parent.mkdir(exist_ok=True)
    f.write_text(json.dumps(sorted(set(load(f'bad/{pid}.json', [])) | set(files))))

def move_out(pid, tag):
    for f in (D / 'out').glob(f'{pid}.*'):
        shutil.move(str(f), D / 'old' / f'{f.stem}.{tag}{f.suffix}')

def research(pid):
    move_out(pid, 'gaps')
    if (D / 'cand' / f'{pid}.json').exists():
        shutil.move(str(D / 'cand' / f'{pid}.json'), D / 'old' / f'{pid}.cand.gaps.json')
    if (D / 'cand' / pid).is_dir():
        shutil.rmtree(D / 'cand' / pid)

def finish():
    """Put each re-pick's published cutout back as alternative 0, the new ones after it."""
    for pid in load('repick.json', []):
        st_file, old = D / 'out' / f'{pid}.json', D / 'old' / f'{pid}.repick.json'
        if not st_file.exists() or not old.exists():
            print(pid, 'not cut yet' if old.exists() else 'already finished')
            continue
        st, prev = json.loads(st_file.read_text(encoding='utf8')), json.loads(old.read_text(encoding='utf8'))
        new = st.get('results', []) if st.get('ok') else []
        for r in sorted(new, key=lambda r: -r['k']):   # shift the new ones up by one, highest first
            shutil.move(str(D / 'out' / f"{pid}.{r['k']}.webp"), D / 'out' / f"{pid}.{r['k'] + 1}.webp")
            r['k'] += 1
        shutil.move(str(D / 'old' / f'{pid}.0.repick.webp'), D / 'out' / f'{pid}.0.webp')
        st.update(ok=True, results=[{**prev['results'][0], 'k': 0, 'current': True}] + new)
        st_file.write_text(json.dumps(st))
        old.unlink()
        print(pid, 'published cutout kept as 0,', len(new), 'new alternatives')

if '--finish' in sys.argv:
    finish()
    sys.exit()
if '--dry' in sys.argv:   # counts only, no file touched
    ban = move_out = research = lambda *a: None
    save = lambda name, v: print('would write', name, len(v))

(D / 'old').mkdir(exist_ok=True)
players = load('players.json', [])
careers = json.loads((ROOT / 'data' / 'careers.json').read_text(encoding='utf8'))['players']
portraits = json.loads((ROOT / 'data' / 'portraits.json').read_text(encoding='utf8'))
marks = load('marks.json', {'wrong': [], 'flagged': []})
wrong = set(marks['wrong']) | set(marks.get('flagged', []))
approved, choices = set(load('approved.json', [])), load('choices.json', {})
marked = set(load('marked.json', []))
repick = [r for r in arg('--repick', '').split(',') if r]

def weight(p):
    c = load(f"cand/{p['id']}.json", None)
    span = c['span'] if c else rank.span_and_prime(careers.get(p['id'], {}).get('stints'), p.get('club'))[0]
    recent = (c or {}).get('manager') or (span and span[1] >= RECENT)
    return p.get('views', 0) * (1 if recent else OLD_WEIGHT), bool(recent)

gaps = []
for p in players:
    pid = p['id']
    if portraits.get(pid, {}).get('source') == 'processed' or pid in choices or (pid in approved and pid not in wrong):
        continue
    w, recent = weight(p)
    gaps.append((w, recent, p))
    if len(gaps) >= 4 * N:   # players.json is most viewed first: the top N by weighted views are in here
        break
gaps.sort(key=lambda g: -g[0])
batch = [g[2] for g in gaps[:N]]
by_id = {p['id']: p for p in players}
batch += [by_id[r] for r in repick if r in by_id and r not in {p['id'] for p in batch}]

redo, counts = [], {'review': 0, 'blurry': 0, 'search': 0, 'pick': 0, 'repick': 0}
for p in batch:
    pid = p['id']
    st = load(f'out/{pid}.json', None)
    sharp = [r for r in (st or {}).get('results', []) if sharp_ok(pid, r['k'])] if st and st.get('ok') else []
    if pid in repick:
        prev = st['results'][0]
        ban(pid, [prev['file']])
        move_out(pid, 'repick')
        if (D / 'cand' / f'{pid}.json').exists():   # search again: Openverse and the wider rules may find a sharper one
            shutil.move(str(D / 'cand' / f'{pid}.json'), D / 'old' / f'{pid}.cand.repick.json')
        marked.add(pid)
        redo.append(p)
        counts['repick'] += 1
    elif pid in wrong or pid in marked:
        if len(sharp) >= 3:
            counts['pick'] += 1
            continue
        marked.add(pid)
        research(pid)
        redo.append(p)
        counts['search'] += 1
    elif st and st.get('ok'):
        if sharp:
            counts['review'] += 1
            continue
        ban(pid, [r['file'] for r in st['results']])   # a blurry upscale: the next candidate instead
        move_out(pid, 'blurry')
        redo.append(p)
        counts['blurry'] += 1
    else:   # kit card, or not searched yet
        research(pid)
        redo.append(p)
        counts['search'] += 1

save('focus-gaps.json', [p['id'] for p in batch])
if "--dry" in sys.argv: print([(p["name"], round(w/1e6, 2), r) for w, r, p in gaps[:N]])
save('gaps-redo.json', redo)
save('marked.json', sorted(marked))
save('repick.json', sorted(set(load('repick.json', [])) | set(repick)))
print(len(batch), 'players in focus-gaps.json;', sum(g[1] for g in gaps[:N]), 'recent;', counts)
print(len(redo), 'to run through candidates.py / cutout.py:  gaps-redo.json')
