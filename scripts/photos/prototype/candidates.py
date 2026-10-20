"""Photo test, step 1: every in-era Commons photo of each player, ranked by face.

Usage: python candidates.py <dir>   (reads <dir>/players.json and data/portraits.json for career spans)
Writes <dir>/cand/<id>/*.jpg and <dir>/cand/<id>.json: candidates, best first, with why.

Ranking, best first: one clear face (no second face half its size), face big in the
frame, enough photo below the face for head and shoulders (else the cutout floats),
then sharpness of the face.
"""
import json, re, sys, time, unicodedata, urllib.parse, urllib.request
from pathlib import Path
import cv2
import numpy as np

D = Path(sys.argv[1])
ROOT = D.parent.parent
UA = {'User-Agent': 'ChainFootballGame/0.1 (jonno@m1llar.com) photo-test'}
API = 'https://commons.wikimedia.org/w/api.php'
YUNET = str(D.parent / 'models' / 'yunet.onnx')
MAX_FILES = 40
BELOW = 2.65   # face heights of photo needed under the face top (crop is 3.2h, starting 0.55h above)

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
    files = members(cat, 'file')
    subs = members(cat, 'subcat')
    for s in [x for x in subs if re.search('by year', x, re.I)]:
        subs += members(s.removeprefix('Category:'), 'subcat')
    for s in subs:
        y = re.search(r'\b(19|20)\d\d\b', s)
        if y and span[0] <= int(y.group()) <= span[1] + 1:
            files += members(s.removeprefix('Category:'), 'file')
    return list(dict.fromkeys(f for f in files if re.search(r'\.(jpe?g|png)$', f, re.I)))

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
            out[p['title']] = {'year': int(y.group()) if y else None, 'thumb': ii.get('thumburl'),
                               'w': ii.get('width'), 'h': ii.get('height')}
    return out

def judge(img):
    """(score, why, face box) for one photo."""
    h, w = img.shape[:2]
    det = cv2.FaceDetectorYN.create(YUNET, '', (w, h), 0.7)
    _, faces = det.detect(img)
    if faces is None or len(faces) == 0:
        return 0, 'no face', None
    faces = sorted(faces, key=lambda f: -f[3])
    x, y, fw, fh, conf = *[int(v) for v in faces[0][:4]], float(faces[0][-1])
    if len(faces) > 1 and faces[1][3] > 0.5 * fh:
        return 0, 'two people', None
    if fh < 50:
        return 0, f'face {fh}px, too small', None
    room = (h - y) / fh
    if room < 2.2:
        return 0, f'photo ends at the chin ({room:.1f} face heights below)', None
    grey = cv2.cvtColor(img[y:y + fh, x:x + fw], cv2.COLOR_BGR2GRAY)
    sharp = cv2.Laplacian(grey, cv2.CV_64F).var() if grey.size else 0
    share = fh / h
    score = conf * min(fh, 300) * min(share / 0.12, 1.5) * min(room / BELOW, 1) * min(sharp / 80, 1.5)
    return round(score, 1), f'face {fh}px, {share:.0%} of height, sharpness {sharp:.0f}', [x, y, fw, fh]

portraits = json.loads((ROOT / 'data' / 'portraits.json').read_text(encoding='utf-8'))
careers = json.loads((ROOT / 'data' / 'careers.json').read_text(encoding='utf-8'))['players']
THIS_YEAR = time.gmtime().tm_year

def career_span(qid):
    """First and last playing year. A last spell with no end year means still playing: run to this year."""
    span = list(portraits[qid]['career'])
    stints = careers.get(qid, {}).get('stints') or []
    if stints and 'to' not in stints[-1] and not stints[-1].get('loan'):
        span[1] = THIS_YEAR
    return span
PLAYERS = sys.argv[2] if len(sys.argv) > 2 else 'players.json'
LIMIT = int(sys.argv[3]) if len(sys.argv) > 3 else 12
for p in json.loads((D / PLAYERS).read_text(encoding='utf-8'))[:LIMIT]:
    span = career_span(p['id'])
    if (D / 'cand' / f"{p['id']}.json").exists():
        continue
    cat, p18 = wikidata(p['id'])
    files = files_for(cat, span) if cat else []
    surname = fold(p['name'].split()[-1])
    files = [f for f in files if surname in fold(f)][:MAX_FILES * 2]
    # Wikidata's chosen image is the community's pick: always a candidate, and it wins if it passes.
    if p18:
        files = [p18] + [f for f in files if f != p18]
    meta = info(files)
    era = [f for f in files if meta.get(f, {}).get('year') and span[0] <= meta[f]['year'] <= span[1] + 1][:MAX_FILES]
    folder = D / 'cand' / p['id']
    folder.mkdir(parents=True, exist_ok=True)
    ranked = []
    for n, f in enumerate(era):
        raw = get(meta[f]['thumb'])
        if not raw:
            continue
        img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            continue
        score, why, box = judge(img)
        local = folder / f'{n}.jpg'
        local.write_bytes(raw)
        ranked.append({'file': f, 'p18': f == p18, 'year': meta[f]['year'], 'local': str(local.relative_to(D)).replace('\\', '/'),
                       'score': score, 'why': why, 'box': box})
        time.sleep(0.3)
    ranked.sort(key=lambda r: (not (r['p18'] and r['score'] > 0), -r['score']))
    (D / 'cand' / f"{p['id']}.json").write_text(json.dumps(ranked, indent=1), encoding='utf-8')
    best = ranked[0] if ranked and ranked[0]['score'] > 0 else None
    print(f"{p['name']}: category {cat!r}, {len(files)} files, {len(era)} in era, "
          f"{sum(r['score'] > 0 for r in ranked)} usable; best: {best['file'] if best else 'none'}", flush=True)
