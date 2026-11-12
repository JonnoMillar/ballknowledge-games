"""Colour grades for the lobby: pull the orange cast back so paper, grass and
shirts get their contrast. The same per-pixel grade runs on the baked frame,
every cut-out and every patch, so graded pieces still match each other.
Writes img/gen/grade-<name>/... mirroring img/gen. Free, local.
Run: python -X utf8 design-drafts/brand-concepts/grade.py
"""
import os, glob
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, 'img', 'gen')

GRADES = {
    # name: (shift yellow b*, shift red a*, keep this much orange chroma, lift paper highlights)
    'cool':    (-9, -3, 0.78, 0.10),
    'neutral': (-16, -5, 0.62, 0.18),
}

def grade(rgb, b_shift, a_shift, orange_keep, lift):
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    L, a, b = lab[..., 0], lab[..., 1] - 128, lab[..., 2] - 128
    # orange/yellow band (hue ~35-95 deg) loses chroma; greens, blues, reds stay
    hue = (np.degrees(np.arctan2(b, a)) + 360) % 360
    band = np.clip(1 - np.abs(hue - 65) / 35, 0, 1)
    k = 1 - band * (1 - orange_keep)
    a, b = a * k + a_shift, b * k + b_shift
    # bright low-chroma areas (paper, wall) drift towards white, not cream
    paper = np.clip((L - 150) / 80, 0, 1) * np.clip(1 - np.hypot(a, b) / 40, 0, 1)
    a, b = a * (1 - paper * lift * 2), b * (1 - paper * lift * 2)
    L = np.clip(L + paper * lift * 25, 0, 255)
    # gentle S-curve for contrast
    x = L / 255; L = 255 * (x + 0.10 * (x - 0.5) * (1 - np.abs(2 * x - 1)))
    out = np.dstack([np.clip(L, 0, 255), np.clip(a + 128, 0, 255), np.clip(b + 128, 0, 255)]).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_LAB2RGB)

files = [os.path.join(G, 'sunny-baked-low.png')] + sorted(glob.glob(os.path.join(G, 'items', '*.png')))
for name, p in GRADES.items():
    for f in files:
        im = Image.open(f); arr = np.asarray(im.convert('RGBA'))
        out = grade(np.ascontiguousarray(arr[..., :3]), *p)
        rel = os.path.relpath(f, G); dst = os.path.join(G, f'grade-{name}', rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if im.mode == 'RGBA': Image.fromarray(np.dstack([out, arr[..., 3]]), 'RGBA').save(dst)
        else: Image.fromarray(out).save(dst)
    print(name, 'done')
