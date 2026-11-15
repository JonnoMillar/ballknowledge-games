"""Kit card figures: anonymous head-and-shoulders silhouettes made from OUR OWN cutouts.

Usage: python kit_figure.py <dir> <out_dir>
Every cutout is cropped to the same box (face in the same place, body off the bottom edge), so the
mean of many front-facing ones is a clean, likeness-free head and shoulders in exactly the frame a
real cutout fills. Writes <out_dir>/kit-avg-hard.png (a solid shape), kit-avg-soft.png (the mean,
contrast-stretched: hair and shoulders fade at the edge) and kit-one.png (one front-facing cutout
blacked out, the old idea done from a better source). All are opaque-white-on-transparent masks:
the site colours them with CSS mask.
"""
import json, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
clip = json.loads((D / 'clip.json').read_text()) if (D / 'clip.json').exists() else {}
alphas, names = [], []
for p in json.loads((D / 'players.json').read_text(encoding='utf8')):
    f = D / 'out' / f"{p['id']}.0.webp"
    c = D / 'cand' / f"{p['id']}.json"
    if not f.exists() or not c.exists() or clip.get(f"{p['id']}.0", {}).get('kit', 0) < 0.95:
        continue
    st = json.loads((D / 'out' / f"{p['id']}.json").read_text(encoding='utf8'))
    if not st.get('ok'):
        continue
    best = next((x for x in json.loads(c.read_text(encoding='utf8'))['cands'] if x['file'] == st['results'][0]['file']), None)
    if not best or abs(best.get('yaw', 9)) > 0.12 or abs(best.get('roll', 9)) > 4 or abs(best.get('cx', 0) - 0.5) > 0.12:
        continue   # front-facing, upright, centred only
    alphas.append(np.array(Image.open(f).convert('RGBA'))[..., 3] / 255.0)
    names.append(p['name'])
print(len(alphas), 'front-facing cutouts')
mean = np.mean(alphas, 0)
soft = np.clip((mean - 0.25) / 0.5, 0, 1)
soft = cv2.GaussianBlur(soft, (0, 0), 2)
hard = (cv2.GaussianBlur(mean, (0, 0), 3) > 0.5).astype(np.float32)
for name, a in (('kit-avg-soft', soft), ('kit-avg-hard', cv2.GaussianBlur(hard, (0, 0), 1.2))):
    rgba = np.zeros(a.shape + (4,), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(rgba).save(OUT / f'{name}.png')
# one real cutout, most typical: the one closest to the mean silhouette
dist = [float(np.abs(a - mean).mean()) for a in alphas]
k = int(np.argmin(dist))
print('most typical:', names[k])
one = (alphas[k] * 255).astype(np.uint8)
rgba = np.zeros(one.shape + (4,), np.uint8)
rgba[..., :3] = 255
rgba[..., 3] = one
Image.fromarray(rgba).save(OUT / 'kit-one.png')
(OUT / 'kit-one.txt').write_text(names[k])
