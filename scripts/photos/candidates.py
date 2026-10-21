"""Photo pipeline step 1-3: every in-era Commons photo of each player, gated and ranked (rank.py).

Usage: python candidates.py <dir> [players.json] [part/of]
Reads <dir>/players.json ([{id, name, club}]) and <dir>/../models/yunet.onnx.
Writes <dir>/cand/<id>/*.jpg and <dir>/cand/<id>.json: every candidate, best first. A candidate
failing a gate has `gate` set to the reason and score 0; the rest have `score` and their features.
"""
import json, re, sys, time, unicodedata, urllib.parse, urllib.request
from pathlib import Path
import cv2
cv2.setNumThreads(1)   # many of these run side by side
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
import rank

D = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[2]
UA = {'User-Agent': 'ChainFootballGame/0.1 (jonno@m1llar.com) photo-pipeline'}
API = 'https://commons.wikimedia.org/w/api.php'
YUNET = str(D.parent / 'models' / 'yunet.onnx')
MAX_FILES = 40
MIN_FACE, MIN_ROOM = 50, 1.6   # px; face heights of photo below the face top. 1.6 not 2.2: Jonno picked photos
# at 1.7-2.0 in round 2. They cannot become a cutout (it would float); rank.py scores them down and the
# pipeline shows them as an uncut photo if nothing better exists.

def get(url):
    for a in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except Exception:
            time.sleep(2 * (a + 1))
    return None

def api(**q):
    q.update(format='json')
    raw = get(API + '?' + urllib.parse.urlencode(q))
    return json.loads(raw) if raw else {}

def fold(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()

def wikidata(qid):
    """(Commons category, Wikidata's chosen image) for a player."""
    raw = get(f'https://www.wikidata.org/wiki/Special:EntityData/{qid}.json')
    claims = json.loads(raw)['entities'][qid]['claims'] if raw else {}
    val = lambda p: claims.get(p, [{}])[0].get('mainsnak', {}).get('datavalue', {}).get('value')
    p18 = val('P18')
    return val('P373'), (f'File:{p18}' if p18 else None)

def members(cat, kind):
    j = api(action='query', list='categorymembers', cmtype=kind, cmlimit=200, cmtitle=f'Category:{cat}')
    return [m['title'] for m in j.get('query', {}).get('categorymembers', [])]

def files_for(cat, span):
    """{file: year of the subcategory it was found in, or None}: the player's own category plus the
    year subcategories inside the career. A year subcategory dates a scan that has no EXIF."""
    found = {f: None for f in members(cat, 'file')}
    subs = members(cat, 'subcat')
    for s in [x for x in subs if re.search('by year', x, re.I)]:
        subs += members(s.removeprefix('Category:'), 'subcat')
    for s in subs:
        y = re.search(r'\b(19|20)\d\d\b', s)
        if y and span[0] <= int(y.group()) <= span[1] + 1:
            for f in members(s.removeprefix('Category:'), 'file'):
                found.setdefault(f, int(y.group()))
    return {f: y for f, y in found.items() if re.search(r'\.(jpe?g|png)$', f, re.I)}

def search(name, surname):
    """Commons full-text search for photos of a player the category route found nothing for."""
    j = api(action='query', list='search', srnamespace=6, srlimit=50, srsearch=f'{name} filetype:bitmap')
    return [h['title'] for h in j.get('query', {}).get('search', []) if surname in fold(h['title'])
            and re.search(r'\.(jpe?g|png)$', h['title'], re.I)]

def info(titles):
    out = {}
    for k in range(0, len(titles), 40):
        j = api(action='query', prop='imageinfo', iiprop='url|extmetadata|size', iiurlwidth=900,
                titles='|'.join(titles[k:k + 40]))
        for p in j.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            meta = ii.get('extmetadata', {})
            raw = (meta.get('DateTimeOriginal') or meta.get('DateTime') or {}).get('value', '')
            y = re.search(r'\b(1[89]\d\d|20\d\d)\b', raw)
            out[p['title']] = {'exif': int(y.group()) if y else None, 'thumb': ii.get('thumburl')}
    return out

def judge(img):
    """(gate reason or None, features or None) for one photo."""
    h, w = img.shape[:2]
    det = cv2.FaceDetectorYN.create(YUNET, '', (w, h), 0.7)
    _, faces = det.detect(img)
    if faces is None or len(faces) == 0:
        return 'no face', None
    faces = sorted(faces, key=lambda f: -f[3])
    r = faces[0]
    x, y, fw, fh = (int(v) for v in r[:4])
    if len(faces) > 1 and faces[1][3] > 0.5 * fh:
        return 'two people', None
    if fh < MIN_FACE:
        return f'face {fh}px, too small', None
    room = (h - y) / fh
    if room < MIN_ROOM:
        return f'photo ends at the chin ({room:.1f} face heights below)', None
    grey = cv2.cvtColor(img[max(y, 0):y + fh, max(x, 0):x + fw], cv2.COLOR_BGR2GRAY)
    sharp = int(cv2.Laplacian(grey, cv2.CV_64F).var()) if grey.size else 0
    re_, le, nose = r[4:6], r[6:8], r[8:10]
    ed = float(np.linalg.norm(re_ - le)) or 1.0
    f = {'face': fh, 'share': round(fh / h, 2), 'sharp': sharp, 'room': round(room, 1), 'box': [x, y, fw, fh],
         'yaw': round(float((nose[0] - (re_[0] + le[0]) / 2) / ed), 2),
         'roll': round(float(np.degrees(np.arctan2(le[1] - re_[1], le[0] - re_[0]))), 1),
         'cx': round((x + fw / 2) / w, 2)}
    if sharp < rank.MIN_SHARP:
        return f'face sharpness {sharp}, soft', f
    return None, f

careers = json.loads((ROOT / 'data' / 'careers.json').read_text(encoding='utf8'))['players']
players = json.loads((D / (sys.argv[2] if len(sys.argv) > 2 else 'players.json')).read_text(encoding='utf8'))
if len(sys.argv) > 3:
    i, n = (int(v) for v in sys.argv[3].split('/'))
    players = players[i::n]
for p in players:
    out = D / 'cand' / f"{p['id']}.json"
    if out.exists():
        continue
    span, prime = rank.span_and_prime(careers.get(p['id'], {}).get('stints'), p.get('club'))
    if not span:
        print(f"{p['name']}: no career", flush=True)
        continue
    cat, p18 = wikidata(p['id'])
    found = files_for(cat, span) if cat else {}
    surname = fold(p['name'].split()[-1])

    def pick_era(deep):
        names = list(found) if deep else [f for f in found if surname in fold(f)]
        files = names[:MAX_FILES * 2]
        if deep:   # no surname in the filename needed, and the name search adds files outside the category
            files += [f for f in search(p['name'], surname) if f not in files]
        if p18:
            files = [p18] + [f for f in files if f != p18]
            found.setdefault(p18, None)
        meta = info(files)
        year = {}
        for f in files:
            m = re.search(r'(?<!\d)(19[5-9]\d|20[0-3]\d)(?!\d)', f)
            year[f] = meta.get(f, {}).get('exif') or found.get(f) or (int(m.group()) if m else None)
        era = [f for f in files if year[f] and span[0] <= year[f] <= span[1] + 1 and meta.get(f, {}).get('thumb')][:MAX_FILES]
        return files, meta, year, era

    files, meta, year, era = pick_era(False)
    folder = D / 'cand' / p['id']
    folder.mkdir(parents=True, exist_ok=True)

    def rank_all(era, meta, year):
        ranked = []
        for n, f in enumerate(era):
            raw = get(meta[f]['thumb'])
            img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR) if raw else None
            if img is None:
                continue
            gate, feats = judge(img)
            (folder / f'{n}.jpg').write_bytes(raw)
            c = {'file': f, 'p18': f == p18, 'year': year[f], 'local': f"cand/{p['id']}/{n}.jpg", 'gate': gate}
            if feats:
                c.update(feats)
                c['why'] = gate or f"face {feats['face']}px, {round(feats['share'] * 100)}% of height, sharpness {feats['sharp']}"
            else:
                c['why'] = gate
            c['score'] = 0 if gate else round(rank.score(c, prime), 3)
            ranked.append(c)
            time.sleep(0.1)
        return ranked

    ranked = rank_all(era, meta, year)
    deep = False
    if not any(r['score'] > 0 for r in ranked):
        files, meta, year, era = pick_era(True)
        ranked, deep = rank_all(era, meta, year), True
    ranked.sort(key=lambda r: -r['score'])
    out.write_text(json.dumps({'span': span, 'prime': prime, 'cat': cat, 'files': len(files), 'deep': deep, 'cands': ranked}, indent=1), encoding='utf8')
    print(f"{p['name']}: {cat!r}, {len(files)} files, {len(era)} in era, {sum(r['score'] > 0 for r in ranked)} usable, "
          f"deep={deep}", flush=True)
