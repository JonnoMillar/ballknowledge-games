"""Photo pipeline step 1-3: every in-era Commons photo of each player, gated and ranked (rank.py).

Usage: python candidates.py <dir> [players.json] [part/of]
Reads <dir>/players.json ([{id, name, club}]) and <dir>/../models/yunet.onnx.
Writes <dir>/cand/<id>/*.jpg and <dir>/cand/<id>.json: every candidate, best first. A candidate
failing a gate has `gate` set to the reason and score 0; the rest have `score` and their features.
"""
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from pathlib import Path
import cv2
cv2.setNumThreads(1)   # many of these run side by side
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
import rank

D = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[2]
UA = {'User-Agent': 'BallKnowledgePhotoPipeline/0.1 (football games site, photo research)'}
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
    """(Commons category, Wikidata's chosen image, is he also an association football manager) for a player."""
    raw = get(f'https://www.wikidata.org/wiki/Special:EntityData/{qid}.json')
    ent = json.loads(raw)['entities'][qid] if raw else {}
    claims = ent.get('claims', {})
    val = lambda p: claims.get(p, [{}])[0].get('mainsnak', {}).get('datavalue', {}).get('value')
    p18 = val('P18')
    jobs = {c.get('mainsnak', {}).get('datavalue', {}).get('value', {}).get('id') for c in claims.get('P106', [])}
    # No P373 (Antony, Frimpong on 2026-11-17): the Commons sitelink often names the category anyway.
    link = ent.get('sitelinks', {}).get('commonswiki', {}).get('title', '')
    cat = val('P373') or (link.removeprefix('Category:') if link.startswith('Category:') else None)
    return cat, (f'File:{p18}' if p18 else None), 'Q628099' in jobs

def members(cat, kind):
    j = api(action='query', list='categorymembers', cmtype=kind, cmlimit=200, cmtitle=f'Category:{cat}')
    return [m['title'] for m in j.get('query', {}).get('categorymembers', [])]

SKIP_SUB = re.compile(r'video|audio|signature|autograph|logo|kit|shirt|jersey|card|panini|trading|statue|wax|mural|fans?\b|stadium|stamp|coin|graffiti|caricature', re.I)

def files_for(cat, span):
    """{file: year of the subcategory it was found in, or None}: the player's own category and its
    subcategories two levels down (up to 30; Commons files a player's photos under "playing for X",
    "with Y", by year...). A year in a subcategory's name dates a scan that has no EXIF, and a year
    outside the career drops the subcategory."""
    found = {f: None for f in members(cat, 'file')}
    frontier, seen = [cat], {cat}
    for _ in range(2):
        nxt = []
        for c in frontier:
            for s in members(c, 'subcat'):
                name = s.removeprefix('Category:')
                if name in seen or len(seen) > 30 or (SKIP_SUB.search(name) and not re.search('by year', name, re.I)):
                    continue
                seen.add(name)
                y = re.search(r'\b(19|20)\d\d\b', name)
                year = int(y.group()) if y else None
                if year and not span[0] <= year <= span[1] + 1:
                    continue
                for f in members(name, 'file'):
                    found.setdefault(f, year)
                nxt.append(name)
        frontier = nxt
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
            out[p['title']] = {'exif': int(y.group()) if y else None, 'thumb': ii.get('thumburl'), 'width': ii.get('width') or 0}
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
    # Only a face inside the square cutout.py will crop (3.2 face heights, from 0.55 above the face) is a second
    # person in the picture: a team-mate a few metres away in a match photo is cropped out (2026-11-17: this gate
    # took 8 of Garnacho's 15 photos, 9 of Reijnders' 15). What is left beside him the cutout checks still catch.
    side, cxm, top = 3.2 * fh, x + fw / 2, y - 0.55 * fh
    near = [f for f in faces[1:] if f[0] < cxm + side / 2 and f[0] + f[2] > cxm - side / 2 and f[1] < top + side and f[1] + f[3] > top]
    second = max(f[3] for f in near) / fh if near else 0.0
    if second > 0.85:   # a true two-shot; a neighbour behind him is a score penalty and a cutout check
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
         'cx': round((x + fw / 2) / w, 2), 'second': round(float(second), 2)}
    if sharp < rank.HARD_SHARP:
        return f'face sharpness {sharp}, mush', f
    return None, f

OPENVERSE = 'https://api.openverse.org/v1/images/'
# Licences that let us adapt (cut out) and show the photo with credit: BY, BY-SA, CC0, public domain mark.
OV_LICENCES = 'by,by-sa,cc0,pdm'

def from_openverse(p, surname, folder, first_n, prime):
    """Candidates from Openverse outside Wikimedia (mostly Flickr): the same gates and score as a
    Commons photo, found by name. The API is slow (5-15 s) and sometimes 504s: retried, then skipped.
    Only results with his surname in the title or tags count; the check Jonno does on /photo-check is
    the guard against the wrong person. `origin` carries what the credit needs."""
    q = urllib.parse.urlencode({'q': f'"{p["name"]}"', 'license': OV_LICENCES, 'excluded_source': 'wikimedia,wikimedia_audio', 'category': 'photograph', 'page_size': 20})
    j = None
    for a in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(f'{OPENVERSE}?{q}', headers=UA), timeout=90) as r:
                j = json.loads(r.read())
            break
        except Exception:
            time.sleep(5 * (a + 1))
    ranked = []
    for k, r in enumerate((j or {}).get('results', [])):
        tags = ' '.join(t.get('name', '') for t in r.get('tags') or [])
        if surname not in fold(f"{r.get('title') or ''} {tags}") or not r.get('url'):
            continue
        raw = get(r['url'])
        img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR) if raw else None
        if img is None:
            continue
        if img.shape[1] > 1400:   # Flickr originals are huge: judge and cut a 900-wide copy, as for Commons thumbs
            img = cv2.resize(img, (900, int(img.shape[0] * 900 / img.shape[1])), interpolation=cv2.INTER_AREA)
            raw = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])[1].tobytes()
        try:
            gate, feats = judge(img)
        except cv2.error:
            continue
        n = first_n + k
        (folder / f'{n}.jpg').write_bytes(raw)
        c = {'file': f"openverse:{r['id']}", 'p18': False, 'year': None, 'named': True, 'local': f"cand/{p['id']}/{n}.jpg", 'gate': gate,
             'origin': {'source': r.get('source'), 'id': r['id'], 'title': r.get('title'), 'creator': r.get('creator'), 'creatorUrl': r.get('creator_url'),
                        'licence': f"{r.get('license')} {r.get('license_version')}", 'licenceUrl': r.get('license_url'), 'url': r.get('foreign_landing_url')}}
        if feats:
            c.update(feats)
        c['why'] = gate or f"openverse, face {feats['face']}px, sharpness {feats['sharp']}"
        s = None if gate else rank.score(c, prime)
        if s is None and not gate:
            c['gate'] = c['why'] = 'profile, seen from the side'
        c['score'] = round(s, 3) if s else 0
        ranked.append(c)
        time.sleep(0.2)
    return ranked

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
    cat, p18, manager = wikidata(p['id'])
    found = files_for(cat, span) if cat else {}
    surname = fold(p['name'].split()[-1])

    def pick_era(deep):
        # Files found by category need no surname in the name (match photos rarely have one); named
        # files go first, and rank.py scores the unnamed down.
        names = sorted(found, key=lambda f: surname not in fold(f))
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
        # Undated files count for anyone who played into the 2010s (Commons is mostly recent). The deep
        # pass also takes photos up to 30 years after the career: a suit or a studio shot is caught by
        # the cutout checks, and for a retired legend that is often all Commons has.
        # A manager's photos from his managing years count too (tracksuit or suit; checks.py allows them).
        late = rank.THIS_YEAR + 1 if manager else span[1] + (30 if deep else 1)
        era = [f for f in files if meta.get(f, {}).get('thumb') and (span[0] <= year[f] <= late if year[f] else span[1] >= 2012)][:MAX_FILES * (2 if deep else 1)]
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
            try:
                gate, feats = judge(img)
                # A face too small in the 900 px thumbnail of a big original (a match photo of the whole box): judge a
                # bigger thumbnail, the first standard width that makes it 50 px. 2026-11-17: Garnacho's Copa América photos.
                small = re.match(r'face (\d+)px, too small', gate or '')
                px = re.search(r'/\d+px-', meta[f]['thumb'])
                if small and px:
                    # Commons serves only standard thumbnail widths (1900 px is a 400; originals are rate-limited, 429).
                    have, face = img.shape[1], max(int(small[1]), 1)
                    w = next((b for b in (1280, 1920) if b > have and b <= meta[f]['width'] and face * b / have >= MIN_FACE), None)
                    if w:
                        raw2 = get(meta[f]['thumb'][:px.start()] + f'/{w}px-' + meta[f]['thumb'][px.end():])
                        img2 = cv2.imdecode(np.frombuffer(raw2, np.uint8), cv2.IMREAD_COLOR) if raw2 else None
                        if img2 is not None:
                            raw, img = raw2, img2
                            gate, feats = judge(img)
            except cv2.error:   # out of memory while the machine is busy: skip this photo, keep the run alive
                continue
            (folder / f'{n}.jpg').write_bytes(raw)
            c = {'file': f, 'p18': f == p18, 'year': year[f], 'named': surname in fold(f), 'local': f"cand/{p['id']}/{n}.jpg", 'gate': gate}
            if feats:
                c.update(feats)
                c['why'] = gate or f"face {feats['face']}px, {round(feats['share'] * 100)}% of height, sharpness {feats['sharp']}"
            else:
                c['why'] = gate
            s = None if gate else rank.score(c, prime)
            if s is None and not gate:   # rank.py's own gates: a profile (nose far off the eye line)
                c['gate'] = c['why'] = 'profile, seen from the side'
            c['score'] = round(s, 3) if s else 0
            ranked.append(c)
            time.sleep(0.1)
        return ranked

    ranked = rank_all(era, meta, year)
    deep = False
    if sum(r['score'] > 0 for r in ranked) < 3:   # was: none at all. Højlund's category holds 4 files; the name search finds more
        files, meta, year, era = pick_era(True)
        ranked, deep = rank_all(era, meta, year), True
    if sum(r['score'] > 0 for r in ranked) < 3 or os.environ.get('OV_ALWAYS'):   # Commons is thin for him: look at Flickr and the rest of Openverse
        # Number past every Commons file judged (not len(ranked): undecodable ones leave gaps, and an Openverse photo then
        # overwrote a Commons candidate's jpg, leaving its face box pointing into the wrong picture; 107 cases on 2026-11-18).
        ranked += from_openverse(p, surname, folder, len(era), prime)
    ranked.sort(key=lambda r: -r['score'])
    out.write_text(json.dumps({'span': span, 'prime': prime, 'cat': cat, 'manager': manager, 'files': len(files), 'deep': deep, 'cands': ranked}, indent=1), encoding='utf8')
    print(f"{p['name']}: {cat!r}, {len(files)} files, {len(era)} in era, {sum(r['score'] > 0 for r in ranked)} usable, "
          f"deep={deep}", flush=True)
