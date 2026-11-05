"""Photo pipeline step 4: cut out the best candidates and crop every face into one box.

Usage: python cutout.py <dir> [players.json] [part/of] [--alts N]
Reads <dir>/cand/<id>.json (candidates.py). For each player tries candidates best first until N
(default 1) give a cutout whose crop passes the floating rule; writes <dir>/out/<id>.<k>.webp
(k = 0 best) and <dir>/out/<id>.json: {ok, results: [{file, k, score, year}]} or {ok: false, why, photo}
where `photo` is always null now: a player with no cutout gets the kit card, never an uncut photo.

Every finished crop goes through checks.py (CLIP "footballer in a shirt", other people or a limb
beside him, a second face, and the Commons description); a crop that fails is dropped, the next
candidate tried, and the reason kept in `rejected`. `bad/<id>.json` lists files an earlier pass
rejected (recheck.py, redo_marked.py), which are skipped. Players in `marked.json` (Jonno marked their
photo wrong) get three alternatives instead of one.

The crop (docs/photo-pipeline.md, decision 3): square, head about a third of the frame, starting
0.55 face heights above the face; the frame's bottom is pulled up to where the body still fills a
quarter of its width, so the body runs off the bottom edge; kept inside the photo's sides; rejected
below 2.3 face heights.
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path
import cv2
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
import rank, checks
from PIL import Image
from rembg import new_session, remove

D = Path(sys.argv[1])
OUT = D / 'out'
OUT.mkdir(exist_ok=True)
SIDE = 440        # px: 2.7x the widest sticker (164 px)
MIN_HEADS = 2.0
TRIES = 8
args = [a for a in sys.argv[2:] if not a.startswith('--')]
ALTS = int(sys.argv[sys.argv.index('--alts') + 1]) if '--alts' in sys.argv else 1
if '--alts' in sys.argv:
    args = [a for a in args if a != str(ALTS)]
session = new_session('birefnet-portrait')
det = cv2.FaceDetectorYN.create(str(D.parent / 'models' / 'yunet.onnx'), '', (SIDE, SIDE), 0.6)
clip = checks.Clip()
UA = {'User-Agent': 'BallKnowledgePhotoPipeline/0.1 (football games site, photo research)'}

def commons_text(file):
    """The file's description and categories as one string; '' if Commons does not answer."""
    q = urllib.parse.urlencode(dict(action='query', format='json', titles=file, prop='categories|imageinfo', cllimit=60, iiprop='extmetadata'))
    for a in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + q, headers=UA), timeout=30) as r:
                pg = next(iter(json.loads(r.read())['query']['pages'].values()))
            desc = (pg.get('imageinfo') or [{}])[0].get('extmetadata', {}).get('ImageDescription', {}).get('value', '')
            return re.sub('<[^>]+>', ' ', desc) + ' ' + ' '.join(c['title'][9:] for c in pg.get('categories', []))
        except Exception:
            time.sleep(2 * (a + 1))
    return ''

def crop(cut: Image.Image, box):
    x, y, w, h = box
    alpha = np.array(cut.getchannel('A'))
    H, W = alpha.shape
    cx, top = x + w / 2, max(int(y - 0.55 * h), 0)
    side = min(int(3.2 * h), W)
    left = int(min(max(cx - side / 2, 0), W - side))
    cols = alpha[:, left:left + side] > 128
    rows = np.where(cols.sum(1) > 0.25 * side)[0]
    body_end = int(rows.max()) + 1 if len(rows) else H
    side = min(side, body_end - top)
    if side < MIN_HEADS * h:
        return None
    left = int(min(max(cx - side / 2, 0), W - side))
    return cut.crop((left, top, left + side, top + side)).resize((SIDE, SIDE), Image.LANCZOS)

marked = set(json.loads((D / 'marked.json').read_text(encoding='utf8'))) if (D / 'marked.json').exists() else set()   # redo_marked.py
players = json.loads((D / (args[0] if args else 'players.json')).read_text(encoding='utf8'))
if len(args) > 1:
    i, n = (int(v) for v in args[1].split('/'))
    players = players[i::n]
for p in players:
    status = OUT / f"{p['id']}.json"
    src = D / 'cand' / f"{p['id']}.json"
    if status.exists() or not src.exists():
        continue
    data = json.loads(src.read_text(encoding='utf8'))
    for c in data['cands']:   # rescore: the ranking may have moved on since candidates.py ran
        if not c['gate'] and rank.NOT_A_PHOTO.search(c['file']):
            c['gate'] = 'not a photo of him'
        elif not c['gate']:
            s = rank.score(c, data['prime'])
            c['gate'], c['score'] = (None, round(s, 3)) if s is not None else ('profile or soft', 0)
    cands = sorted((c for c in data['cands'] if not c['gate']), key=lambda c: -c['score'])
    bad_file = D / 'bad' / f"{p['id']}.json"
    skip = set(json.loads(bad_file.read_text(encoding='utf8'))) if bad_file.exists() else set()
    results, tried, rejected = [], 0, []
    for c in cands:
        if c['file'] in skip:
            continue
        if len(results) >= (3 if p['id'] in marked else ALTS) or tried >= TRIES:
            break
        if c['room'] < MIN_HEADS:   # cheap check: the photo ends too close to the face to fill the frame
            continue
        tried += 1
        text = (c['origin'].get('title') or '') if c.get('origin') else commons_text(c['file'])   # Openverse: its own title
        word = checks.bad_metadata(text, data.get('manager', False))
        if word:
            rejected.append({'file': c['file'], 'why': f'description says {word}'})
            continue
        im = Image.open(D / c['local']).convert('RGB')
        try:
            head = crop(remove(im, session=session), c['box'])
        except Exception as e:   # out of memory on a big photo: skip it, keep the process (and its model) alive
            print(f"  {c['file']}: {str(e)[:80]}", flush=True)
            continue
        if head is None:
            continue
        why, measures = checks.crop_verdict(head, det, clip, data.get('manager', False))
        if why:
            rejected.append({'file': c['file'], 'why': why, **measures})
            continue
        k = len(results)
        head.save(OUT / f"{p['id']}.{k}.webp", 'WEBP', quality=82, method=6)
        results.append({'file': c['file'], 'k': k, 'score': c['score'], 'year': c['year'], 'source': [im.width, im.height], 'face': c['face'], **({'origin': c['origin']} if c.get('origin') else {}), **measures})
    if results:
        status.write_text(json.dumps({'ok': True, 'results': results, 'rejected': rejected}))
        print(f"{p['name']}: {len(results)} cutout(s), best {results[0]['file']}", flush=True)
    else:
        why = f'{tried} cut, none fit' if tried else ('no gate-passing candidate' if not cands else 'every candidate cut too near the face')
        status.write_text(json.dumps({'ok': False, 'why': why, 'photo': None, 'rejected': rejected}))
        print(f"{p['name']}: no cutout ({why})", flush=True)
