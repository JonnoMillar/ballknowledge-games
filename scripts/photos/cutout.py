"""Photo pipeline step 4: cut out the best candidates and crop every face into one box.

Usage: python cutout.py <dir> [players.json] [part/of] [--alts N]
Reads <dir>/cand/<id>.json (candidates.py). For each player tries candidates best first until N
(default 1) give a cutout whose crop passes the floating rule; writes <dir>/out/<id>.<k>.webp
(k = 0 best) and <dir>/out/<id>.json: {ok, results: [{file, k, score, year}]} or {ok: false, why, photo}
where `photo` is the best gate-passing candidate to show uncut when no cutout works.

The crop (docs/photo-pipeline.md, decision 3): square, head about a third of the frame, starting
0.55 face heights above the face; the frame's bottom is pulled up to where the body still fills a
quarter of its width, so the body runs off the bottom edge; kept inside the photo's sides; rejected
below 2.3 face heights.
"""
import json, sys, time
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
import rank
from PIL import Image
from rembg import new_session, remove

D = Path(sys.argv[1])
OUT = D / 'out'
OUT.mkdir(exist_ok=True)
SIDE = 440        # px: 2.7x the widest sticker (164 px)
MIN_HEADS = 2.3
TRIES = 8
args = [a for a in sys.argv[2:] if not a.startswith('--')]
ALTS = int(sys.argv[sys.argv.index('--alts') + 1]) if '--alts' in sys.argv else 1
if '--alts' in sys.argv:
    args = [a for a in args if a != str(ALTS)]
session = new_session('birefnet-portrait')

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
    results, tried = [], 0
    for c in cands:
        if len(results) >= ALTS or tried >= TRIES:
            break
        if c['room'] < MIN_HEADS:   # cheap check: the photo ends too close to the face to fill the frame
            continue
        tried += 1
        im = Image.open(D / c['local']).convert('RGB')
        try:
            head = crop(remove(im, session=session), c['box'])
        except Exception as e:   # out of memory on a big photo: skip it, keep the process (and its model) alive
            print(f"  {c['file']}: {str(e)[:80]}", flush=True)
            continue
        if head is None:
            continue
        k = len(results)
        head.save(OUT / f"{p['id']}.{k}.webp", 'WEBP', quality=82, method=6)
        results.append({'file': c['file'], 'k': k, 'score': c['score'], 'year': c['year'], 'source': [im.width, im.height], 'face': c['face']})
    if results:
        status.write_text(json.dumps({'ok': True, 'results': results}))
        print(f"{p['name']}: {len(results)} cutout(s), best {results[0]['file']}", flush=True)
    else:
        photo = next((c for c in sorted(cands, key=lambda c: -c['score'])), None)
        why = f'{tried} cut, none fit' if tried else ('no gate-passing candidate' if not cands else 'every candidate cut too near the face')
        status.write_text(json.dumps({'ok': False, 'why': why, 'photo': photo['file'] if photo else None}))
        print(f"{p['name']}: no cutout ({why})", flush=True)
