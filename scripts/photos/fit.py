"""Fit ranking weights (rank.W) to Jonno's picks, round 1 + round 2: conditional logit over the photos he saw
for each player, with leave-one-out as the honest score. Usage: python -X utf8 scripts/photos/fit.py"""
import json, math, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
import rank
R = Path(__file__).resolve().parents[2]
J = lambda p: json.loads((R / p).read_text(encoding='utf8'))
careers = J('data/careers.json')['players']
NAMES = ['face', 'share', 'p18', 'dy', 'yaw', 'roll', 'cx', 'sharp']

def vec(f, prime):
    return [min(f['face'], rank.FACE_CAP) / rank.FACE_CAP, min(f['share'], .35) / .35, float(f['p18']),
            min(abs(f['year'] - prime), 12) / 12, abs(f['yaw']), abs(f['roll']) / 10, abs(f['cx'] - .5) * 2,
            min(math.log(max(f['sharp'], 1) / rank.MIN_SHARP), 4)]

groups = []   # (name, matrix of the photos shown that passed the gates, index of the pick)
for p in J('scripts/photos/round1-picks.json'):
    if not p['picked']: continue
    cands = {c['file']: c for c in J(f"scripts/photos/round1-candidates/{p['id']}.json")}
    _, prime = rank.span_and_prime(careers[p['id']]['stints'])
    fs = [(fn, rank.from_why(cands[fn])) for fn in p['shown']]
    groups.append((p['name'], [vec(f, prime) for _, f in fs], [fn for fn, _ in fs].index(p['picked'])))
picks2, shown2 = J('scripts/photos/round2/picks.json'), J('scripts/photos/round2/shown.json')
for pid, v in shown2.items():
    pk = picks2.get(pid)
    if not pk: continue
    c = {x['file']: x for x in J(f'scripts/photos/round2/candidates/{pid}.json')['cands']}
    prime = J(f'scripts/photos/round2/candidates/{pid}.json')['prime']
    ok = [x['file'] for x in v['shown'] if not c[x['file']]['gate']]
    if pk in ok:   # picks the gates rejected carry no features; they are a gate question, not a ranking one
        groups.append((v['name'], [vec(rank.from_why(c[fn]) | {k: c[fn][k] for k in ('yaw', 'roll', 'cx')}, prime) for fn in ok], ok.index(pk)))

def fit(gs, l2=0.3):
    w = np.zeros(len(NAMES))
    for _ in range(500):
        g = np.zeros_like(w)
        for _, X, lab in gs:
            F = np.array(X); s = F @ w; p = np.exp(s - s.max()); p /= p.sum()
            g += F[lab] - p @ F
        w += 0.05 * (g - l2 * w)
    return w
hits = lambda gs, w: sum(int(np.argmax(np.array(X) @ w) == lab) for _, X, lab in gs)
w = fit(groups)
loo = sum(hits([groups[i]], fit(groups[:i] + groups[i + 1:])) for i in range(len(groups)))
print(len(groups), 'groups; train', hits(groups, w), 'leave-one-out', loo)
print({k: round(float(v), 2) for k, v in zip(NAMES, w)})
print('current rank.W:', rank.W, ' hits', hits(groups, np.array([rank.W[k] for k in NAMES])))
