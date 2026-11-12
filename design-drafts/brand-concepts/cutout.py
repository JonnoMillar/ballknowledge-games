"""Cut pinned items out of a baked board using the baked-vs-empty difference.

Both images come from the same generation (the empty one is an edit of the
baked one), so outside the items they line up and the difference is the item.
Writes img/gen/items/<name>.png (RGBA, full-frame size so CSS can stack them at
0,0) and items.json with each item's box in percent.
Run: python -X utf8 design-drafts/brand-concepts/cutout.py
"""
import json, os
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, 'img', 'gen')
baked = np.asarray(Image.open(os.path.join(G, 'sunny-baked-low.png')).convert('RGB'), np.float32)
empty = np.asarray(Image.open(os.path.join(G, 'sunny-empty-low.png')).convert('RGB'), np.float32)
H, W = baked.shape[:2]

# Rough boxes (x0, y0, x1, y1) in the 1344x752 frame; the mask finds the real edge.
BOXES = {
    'spoofed':  (385, 150, 572, 336),
    'chain':    (628, 160, 948, 286),
    'oddman':   (1004, 150, 1224, 302),
    'pin':      (386, 340, 572, 576),
    'olise':    (596, 292, 950, 570),
    'season':   (982, 304, 1184, 426),
    'session':  (972, 396, 1268, 612),
}

# Item = not cork. Learn cork's colour from bare cork in the baked frame (board
# area outside every box), in Lab a/b with lightness as a weak third axis, then
# flag pixels far from it. The diff against the empty plate gates it, so
# anything the edit did not change (wall, frame) never counts.
lab = cv2.cvtColor(baked.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
board = np.zeros((H, W), bool); board[145:605, 345:1258] = True
inbox = np.zeros((H, W), bool)
for (x0, y0, x1, y1) in BOXES.values(): inbox[y0 - 6:y1 + 6, x0 - 6:x1 + 6] = True
cork = lab[board & ~inbox][:, [1, 2, 0]] * np.array([1, 1, 0.25], np.float32)
mu = cork.mean(0); cov = np.cov(cork.T) + np.eye(3) * 1e-3; icov = np.linalg.inv(cov)
X = lab[..., [1, 2, 0]] * np.array([1, 1, 0.25], np.float32) - mu
maha = np.sqrt(np.einsum('...i,ij,...j->...', X, icov, X))
changed = np.abs(baked - empty).max(2) > 18
diff = np.where(changed, maha, 0)
diff = cv2.GaussianBlur(diff, (0, 0), 0.8)
os.makedirs(os.path.join(G, 'items'), exist_ok=True)
meta = {}
for name, (x0, y0, x1, y1) in BOXES.items():
    m = np.zeros((H, W), np.uint8)
    region = diff[y0:y1, x0:x1]
    m[y0:y1, x0:x1] = (region > 4.0).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=3)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k, iterations=1)
    # keep sizeable pieces only (item body, pins, string), then fill holes
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 60: keep[lab == i] = 255
    cnts, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(keep, cnts, -1, 255, thickness=cv2.FILLED)
    keep = cv2.erode(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    alpha = cv2.GaussianBlur(keep, (0, 0), 0.8)
    rgba = np.dstack([baked.astype(np.uint8), alpha])
    Image.fromarray(rgba, 'RGBA').save(os.path.join(G, 'items', f'{name}.png'))
    # Patch: the empty plate under the item (mask grown a little), shown on
    # hover so the lifted item leaves bare cork behind it.
    grow = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    patch = np.dstack([empty.astype(np.uint8), cv2.GaussianBlur(grow, (0, 0), 1.5)])
    Image.fromarray(patch, 'RGBA').save(os.path.join(G, 'items', f'{name}-patch.png'))
    ys, xs = np.where(keep > 0)
    bx = (xs.min(), ys.min(), xs.max(), ys.max())
    meta[name] = {'box': [float(round(bx[0] / W * 100, 2)), float(round(bx[1] / H * 100, 2)), float(round((bx[2] - bx[0]) / W * 100, 2)), float(round((bx[3] - bx[1]) / H * 100, 2))],
                  'fill': round(float((keep[y0:y1, x0:x1] > 0).mean()), 2)}
    print(name, meta[name])
json.dump(meta, open(os.path.join(G, 'items', 'items.json'), 'w'), indent=1)
