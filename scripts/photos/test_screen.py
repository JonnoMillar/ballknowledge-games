"""Checks for screen.py's pure parts: python -X utf8 scripts/photos/test_screen.py (no models, no data)."""
import sys
import numpy as np
sys.argv = ['screen.py']
import screen as S

rng = np.random.default_rng(0)
# logreg + auc: a separable signal is found, noise is not
X = rng.normal(size=(300, 4)); y = (X[:, 0] + 0.3 * rng.normal(size=300) > 0.5).astype(float)
m = S.Model(X, None, y, lam=1.0)
assert S.auc(y, m(X, None)) > 0.9
assert abs(S.auc(y, rng.normal(size=300)) - 0.5) < 0.1
# out-of-fold scores are honest: pure noise labels must not look predictive
yn = (rng.random(300) < 0.2).astype(float)
assert S.auc(yn, S.oof(X, None, yn, dict(lam=8.0), reps=2)) < 0.65
# precision/recall at a rate
p, r = S.at_rate(np.array([1, 1, 0, 0, 0, 0, 0, 0, 0, 0.]), np.arange(10)[::-1].astype(float), 0.2)
assert (p, r) == (1.0, 1.0)

# tag rules on a typical good card and on broken ones
med = {'fx': 0.5, 'fy': 0.33, 'fh': 0.34}; mad = {'fx': 0.02, 'fy': 0.02, 'fh': 0.03}
good = dict(noface=0, faces=1, kit=0.8, train=0.1, dress=0.01, other=0.01, cliptop='kit', srcface=250, blur=6.0, fx=0.5, fy=0.33, fh=0.34,
            top=0.0, floor=0.85, stray=0.0, holes=0.0, soft=0.02, edge=0.0, blobs=1, id_n=5, id_med=0.6, id_coh=0.6, after=-3)
assert S.tag_rules(good, med, mad, S.DEFAULT_TH) == {}
assert 'training' in S.tag_rules({**good, 'train': 0.7, 'kit': 0.2}, med, mad, S.DEFAULT_TH)
assert 'notkit' in S.tag_rules({**good, 'dress': 0.4}, med, mad, S.DEFAULT_TH)
assert 'crop' in S.tag_rules({**good, 'top': 0.3}, med, mad, S.DEFAULT_TH)
assert 'crop' in S.tag_rules({**good, 'fh': 0.6}, med, mad, S.DEFAULT_TH)
assert 'nothim' in S.tag_rules({**good, 'id_med': 0.05, 'id_coh': 0.6}, med, mad, S.DEFAULT_TH)
assert 'nothim' not in S.tag_rules({**good, 'id_med': 0.05, 'id_coh': 0.05}, med, mad, S.DEFAULT_TH)   # his other photos disagree too: no verdict
assert 'old' in S.tag_rules({**good, 'after': 9}, med, mad, S.DEFAULT_TH)
assert 'messy' in S.tag_rules({**good, 'stray': 0.2}, med, mad, S.DEFAULT_TH)
# sharpness floor: a detailed subject passes, the same subject shrunk to 60 px and blown back up to 440 (Figo's case) fails;
# the matte's own edge does not count, and blurry_cutouts lists exactly the soft file
import tempfile, cv2
from pathlib import Path
from PIL import Image
yy, xx = np.mgrid[:440, :440]
detail = (((xx // 6 + yy // 6) % 2) * 120 + 60 + rng.normal(0, 12, (440, 440))).clip(0, 255).astype(np.uint8)
alpha = (((xx - 220) ** 2 + (yy - 260) ** 2) < 170 ** 2).astype(np.uint8) * 255
def rgba(grey):
    return np.dstack([grey, grey, grey, alpha])
soft = cv2.resize(cv2.resize(detail, (60, 60), interpolation=cv2.INTER_AREA), (440, 440), interpolation=cv2.INTER_LANCZOS4)
flat = np.full((440, 440), 128, np.uint8)
assert S.checks.subject_sharpness(rgba(detail)) > 10 * S.checks.MIN_SUBJECT_SHARP
assert S.checks.subject_sharpness(rgba(soft)) < S.checks.MIN_SUBJECT_SHARP
assert S.checks.subject_sharpness(rgba(flat)) < 1   # a hard matte edge on a flat subject is not detail
assert S.checks.subject_sharpness(np.dstack([detail] * 3 + [np.zeros_like(alpha)])) == 0.0   # no subject
with tempfile.TemporaryDirectory() as t:
    Image.fromarray(rgba(detail)).save(f'{t}/Q1.0.webp', lossless=True)
    Image.fromarray(rgba(soft)).save(f'{t}/Q1.1.webp', lossless=True)
    Image.fromarray(rgba(detail)).save(f'{t}/Q2.0.webp', lossless=True)
    assert S.blurry_cutouts(t, Path(t) / 'cache.json') == {'Q1': [1]}
    assert S.blurry_cutouts(t, Path(t) / 'cache.json') == {'Q1': [1]}   # from the cache

assert S.TAGS ==['training', 'notkit', 'lowq', 'crop', 'unusable', 'better', 'nothim', 'messy', 'old'] and S.SOFT == {'training', 'better'}
print('ok')
