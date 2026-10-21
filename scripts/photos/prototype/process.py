"""Photo test: Commons photo -> cutout -> one head-and-shoulders box -> two treatments.

Usage: python -I process.py <dir>   (reads <dir>/players.json and <dir>/raw/<id>.jpg)
Writes <dir>/out/<id>.natural.png, <id>.print.png and a report line per player.
"""
import json, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps
from rembg import new_session, remove

D = Path(sys.argv[1])
OUT = D / 'out'
OUT.mkdir(exist_ok=True)
SIDE = 600
# The gate: a face smaller than this is a crowd or stadium shot, not a portrait. Kit card instead.
MIN_FACE = 50
INK, PAPER = (20, 18, 16), (244, 239, 230)

session = new_session('birefnet-portrait')
YUNET = str(D.parent / 'models' / 'yunet.onnx')

def face_box(rgb: np.ndarray):
    """The largest face YuNet finds, as (x, y, w, h); None if none."""
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    det = cv2.FaceDetectorYN.create(YUNET, '', (bgr.shape[1], bgr.shape[0]), 0.7)
    _, faces = det.detect(bgr)
    if faces is None or len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])[:4]
    return int(x), int(y), int(w), int(h)

def crop(cut: Image.Image, box):
    """Head and shoulders, square, with the body running off the bottom edge.

    A cutout that ends inside the frame floats; so the frame's bottom is pulled
    up to where the body still fills a quarter of its width, and the frame is
    kept inside the photo's sides. None if that leaves less than 2.3 face heights.
    """
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
    if side < 2.3 * h:
        return None
    left = int(min(max(cx - side / 2, 0), W - side))
    return cut.crop((left, top, left + side, top + side)).resize((SIDE, SIDE), Image.LANCZOS)

def printed(img: Image.Image) -> Image.Image:
    alpha = img.getchannel('A')
    grey = ImageOps.autocontrast(img.convert('L'), cutoff=2)
    toned = ImageOps.colorize(grey, black=INK, white=PAPER, mid=(128, 120, 110)).convert('RGBA')
    toned.putalpha(alpha)
    return toned

for p in json.loads((D / 'players.json').read_text(encoding='utf-8'))[:12]:
    if (OUT / f"{p['id']}.json").exists():
        print(f"{p['name']}: already done", flush=True)
        continue
    cands = [c for c in json.loads((D / 'cand' / f"{p['id']}.json").read_text(encoding='utf-8')) if c['score'] > 0]
    status = OUT / f"{p['id']}.json"
    head, tried = None, []
    # Cheap check first: a close-up with under 2.4 face heights below the face can't fill the frame.
    cands = [c for c in cands if c['box'] and (Image.open(D / c['local']).height - c['box'][1]) / c['box'][3] >= 2.4]
    for best in cands[:8]:
        src = Image.open(D / best['local']).convert('RGB')
        box = face_box(np.array(src))
        if box is None or box[3] < MIN_FACE:
            tried.append('no usable face'); continue
        head = crop(remove(src, session=session), box)
        if head is not None:
            break
        tried.append('body ends too close to the face')
    if head is None:
        why = f"{len(tried)} candidates tried: " + ', '.join(tried) if tried else 'no usable candidate'
        status.write_text(json.dumps({'ok': False, 'why': why}))
        print(f"{p['name']}: rejected, {why}", flush=True)
        continue
    head.save(OUT / f"{p['id']}.natural.png")
    printed(head).save(OUT / f"{p['id']}.print.png")
    status.write_text(json.dumps({'ok': True, 'face': box[3], 'source': [src.width, src.height], 'file': best['file'], 'rank': len(tried) + 1}))
    print(f"{p['name']}: source {src.width}x{src.height}, face {box[3]}px tall", flush=True)
