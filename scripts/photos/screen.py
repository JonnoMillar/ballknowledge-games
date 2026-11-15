"""Automatic screen for finished cutouts: which ones Jonno will probably mark, and why.

Usage: python screen.py [dir] features [--limit N]   measure every cutout (resumable: screen/feat.json)
       python screen.py [dir] emb                    CLIP image embeddings of every cutout (screen/emb.npz, resumable)
       python screen.py [dir] fit                    fit on his past decisions, report held-out numbers, write screen.json

Free and local: YuNet + SFace (OpenCV), CLIP ViT-B/32 (checks.Clip), plain numpy. It only SUGGESTS: nothing here
changes what ships (only photos he checked ship, publish.py). Written to <dir>/screen.json:
  {id: {"suspect": 0..1, "tags": [tag ids], "why": {tag: reason}}}  (tag ids: see TAGS, same as components/PhotoCheck.tsx)

Labels are his decisions: approved.json (not wrong) and marks.json wrong/flagged. A wrong card's cutout was moved to
rej/<id>.0.webp when it was redone, so that is the picture he judged. docs/photo-pipeline.md, "Automatic screen".
"""
import json, sys, time
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import checks

args = [a for a in sys.argv[1:] if not a.startswith('--')]
STAGE = args[-1] if args and args[-1] in ('features', 'emb', 'fit') else 'features'
D = Path(args[0]) if args and args[0] not in ('features', 'emb', 'fit') else HERE.parents[1] / '.scratch' / 'photo-all'
LIMIT = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else 10**9
SC = D / 'screen'
SC.mkdir(exist_ok=True)
FEAT = SC / 'feat.json'
MODELS = D.parent / 'models'

# Tag ids, in the order of the number keys 1-9 on the review page. Soft tags still ship.
TAGS = ['training', 'notkit', 'lowq', 'crop', 'unusable', 'better', 'nothim', 'messy', 'old']
SOFT = {'training', 'better'}

# CLIP prompts, in four groups. The groups' probabilities are recomputed in the fit stage from the stored embeddings,
# so a prompt can change without measuring again (run the emb stage once more).
KIT = ['a footballer in a football shirt', 'a footballer in a team jersey with a badge', 'a soccer player in kit']
TRAIN = ['a footballer in a training top', 'a footballer in a tracksuit', 'a footballer wearing a coloured training bib over his shirt',
         'a footballer in a warm-up jacket']
DRESS = ['a man in a suit and tie', 'a man in a jacket and casual clothes', 'a football manager in a coat', 'a man in a plain t-shirt',
         'a man in a polo shirt']
OTHER = ['a painting or mural of a person', 'a wax figure or statue', 'a person speaking on stage at a podium with a microphone',
         'a man in a t-shirt holding a sign', 'a drawing or cartoon', 'a rubber puppet or caricature of a person',
         'a person in a helmet and protective gear']
GROUPS = [('kit', len(KIT)), ('train', len(TRAIN)), ('dress', len(DRESS)), ('other', len(OTHER))]

def group_probs(v, t, names):
    """CLIP's softmax over the prompts for unit image vectors v (n x 512) and unit text vectors t, summed per group."""
    p = np.exp(100 * v @ t.T - (100 * v @ t.T).max(1, keepdims=True))
    p /= p.sum(1, keepdims=True)
    out, i = [], 0
    cols = {}
    for g, n in GROUPS:
        cols[g] = p[:, i:i + n].sum(1)
        i += n
    return [{**{g: float(cols[g][r]) for g in cols}, 'cliptop': names[int(p[r].argmax())]} for r in range(len(p))]

def load(name, empty):
    f = D / name
    return json.loads(f.read_text(encoding='utf8')) if f.exists() else empty

def labelled_items():
    """[(key, id, webp path, result dict, label)]: label 1 = he marked it wrong, 0 = approved, None = undecided."""
    marks = load('marks.json', {'wrong': [], 'flagged': []})
    wrong = set(marks['wrong']) | set(marks.get('flagged', []))
    approved = set(load('approved.json', []))
    focus = load('focus.json', [])
    order = {pid: i for i, pid in enumerate(focus)}
    out = []
    for p in (D / 'out').glob('Q*.json'):
        pid = p.stem
        st = json.loads(p.read_text(encoding='utf8'))
        webp = D / 'out' / f'{pid}.0.webp'
        if st.get('ok') and st.get('results') and webp.exists():
            out.append((pid, pid, webp, st['results'][0], 0 if pid in approved and pid not in wrong else None))
    for pid in wrong:   # the photo he judged wrong was moved to rej/ when the player was redone
        rj, rw = D / 'rej' / f'{pid}.json', D / 'rej' / f'{pid}.0.webp'
        if rj.exists() and rw.exists():
            st = json.loads(rj.read_text(encoding='utf8'))
            if st.get('results'):
                out.append((pid + '@rej', pid, rw, st['results'][0], 1))
    # him first (labelled), then the players in upcoming games, then the rest
    out.sort(key=lambda t: (t[4] is None, order.get(t[1], 10**6), t[0]))
    return out

# ---------------------------------------------------------------- measures of one cutout
def alpha_measures(a):
    m = (a > 128).astype(np.uint8)
    H, W = m.shape
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    areas = stats[1:, 4].astype(float)
    tot = areas.sum() or 1.0
    big = int(areas.argmax()) + 1 if len(areas) else 0
    holes = 0.0
    if big:
        cs, hier = cv2.findContours((lab == big).astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        holes = sum(cv2.contourArea(c) for c, h in zip(cs, hier[0]) if h[3] != -1) / max(areas.max(), 1)
    up = m[: int(0.6 * H)]
    return {
        'area': float(m.mean()),
        'stray': float((tot - (areas.max() if len(areas) else 0)) / tot),              # share of the mask in small separate blobs
        'blobs': int((areas > 0.003 * H * W).sum()),
        'holes': float(holes),                                                          # holes inside the main body
        'soft': float(((a > 20) & (a < 235)).sum() / max(m.sum(), 1)),                  # half-transparent mass: ghosting, fuzzy edge
        'top': float(m[:3].mean()),                                                     # alpha on the top edge: head cut off
        'sideL': float(up[:, :3].any(axis=1).mean()), 'sideR': float(up[:, -3:].any(axis=1).mean()),   # alpha on the sides beside the head
        'floor': float(m[-3:].mean()),                                                  # body width at the bottom edge: low = floating
        'edge': checks.edge_mass(a),
    }

def face_measures(rgba, det):
    alpha = rgba[..., 3:4] / 255.0
    comp = (rgba[..., :3] * alpha + 128 * (1 - alpha)).astype(np.uint8)[..., ::-1].copy()
    h, w = comp.shape[:2]
    det.setInputSize((w, h))
    _, faces = det.detect(comp)
    if faces is None or not len(faces):
        return {'noface': 1, 'faces': 0, 'fx': 0.5, 'fy': 0.3, 'fh': 0.3, 'blur': 0.0}, comp
    f = max(faces, key=lambda r: r[3])
    x, y, fw, fh = [int(round(v)) for v in f[:4]]
    g = cv2.cvtColor(comp, cv2.COLOR_BGR2GRAY)[max(y, 0): y + fh, max(x, 0): x + fw]
    blur = float(np.log1p(cv2.Laplacian(g, cv2.CV_64F).var())) if g.size > 16 else 0.0
    return {'noface': 0, 'faces': int(sum(r[3] > 0.25 * f[3] for r in faces)), 'fx': float((f[0] + f[2] / 2) / w), 'fy': float((f[1] + f[3] / 2) / h),
            'fh': float(f[3] / h), 'blur': blur}, comp

# ---------------------------------------------------------------- identity: the odd one out among his candidate photos
def face_embed(img, det, rec):
    h, w = img.shape[:2]
    s = min(1.0, 900 / max(h, w))
    if s < 1:
        img = cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    det.setInputSize((img.shape[1], img.shape[0]))
    _, faces = det.detect(img)
    if faces is None or not len(faces):
        return None
    f = max(faces, key=lambda r: r[3])
    if f[3] < 40:
        return None
    v = rec.feature(rec.alignCrop(img, f)).ravel()
    return v / (np.linalg.norm(v) + 1e-9)

def identity(pid, file, det, rec):
    """SFace similarity of the chosen photo's face to the player's other candidate photos."""
    cf = D / 'cand' / f'{pid}.json'
    if not cf.exists():
        return {}
    cands = json.loads(cf.read_text(encoding='utf8')).get('cands', [])
    me = next((c for c in cands if c['file'] == file and c.get('local')), None)
    if not me:
        return {}
    def emb(c):
        img = cv2.imread(str(D / c['local']))
        return None if img is None else face_embed(img, det, rec)
    mine = emb(me)
    if mine is None:
        return {'id_n': 0}
    def pool(ok):
        return [c for c in cands if c['file'] != file and c.get('local') and (c.get('gate') or '') != 'no face' and not (c.get('gate') or '').startswith('profile') and ok(c.get('gate') or '')]
    others = pool(lambda g: g != 'two people')
    if len(others) < 3:
        others += pool(lambda g: g == 'two people')
    vs = [v for v in (emb(c) for c in others[:8]) if v is not None]
    if not vs:
        return {'id_n': 0}
    sims = [float(mine @ v) for v in vs]
    pair = [float(vs[i] @ vs[j]) for i in range(len(vs)) for j in range(i + 1, len(vs))]
    return {'id_n': len(vs), 'id_med': float(np.median(sims)), 'id_max': max(sims), 'id_coh': float(np.median(pair)) if pair else None}

# ---------------------------------------------------------------- the features stage
class Grey:
    """CLIP over the grey composite: unit image vectors, and the prompt text vectors."""
    def __init__(self):
        self.c = checks.Clip()
        self.names = KIT + TRAIN + DRESS + OTHER
        with self.c.torch.no_grad():
            self.t = self.c._unit(self.c.model.get_text_features(**self.c.proc(text=self.names, return_tensors='pt', padding=True))).numpy()

    def embed(self, paths):
        ims = []
        for p in paths:
            im = Image.open(p).convert('RGBA')
            ims.append(Image.alpha_composite(Image.new('RGBA', im.size, (128, 128, 128, 255)), im).convert('RGB'))
        with self.c.torch.no_grad():
            return self.c._unit(self.c.model.get_image_features(**self.c.proc(images=ims, return_tensors='pt'))).numpy()

    def groups(self, paths):
        return group_probs(self.embed(paths), self.t, self.names)

def run_features():
    feat = json.loads(FEAT.read_text(encoding='utf8')) if FEAT.exists() else {}
    det = cv2.FaceDetectorYN.create(str(MODELS / 'yunet.onnx'), '', (440, 440), 0.6)
    rec = cv2.FaceRecognizerSF.create(str(MODELS / 'sface.onnx'), '')
    clip = Grey()
    todo = [t for t in labelled_items() if feat.get(t[0], {}).get('file') != t[3]['file'] or feat[t[0]].get('size') != t[2].stat().st_size][:LIMIT]
    print(len(todo), 'to measure,', len(feat), 'done', flush=True)
    t0 = time.time()
    for n in range(0, len(todo), 16):
        batch = todo[n:n + 16]
        groups = clip.groups([t[2] for t in batch])
        for (key, pid, webp, res, _), g in zip(batch, groups):
            rgba = np.array(Image.open(webp).convert('RGBA'))
            fm, _ = face_measures(rgba, det)
            era = {}
            cf = D / 'cand' / f'{pid}.json'
            span = json.loads(cf.read_text(encoding='utf8')).get('span') if cf.exists() else None
            if span and res.get('year'):
                era = {'after': res['year'] - span[1], 'before': span[0] - res['year']}
            src = res.get('source') or [0, 0]
            f = {'file': res['file'], 'size': webp.stat().st_size, 'year': res.get('year'), 'srcface': res.get('face'), 'srcmin': min(src),
                 **alpha_measures(rgba[..., 3]), **fm, **g, **era, **identity(pid, res['file'], det, rec)}
            feat[key] = f
        FEAT.write_text(json.dumps(feat, default=float), encoding='utf8')
        print(n + len(batch), '/', len(todo), f'{time.time() - t0:.0f}s', flush=True)

def run_emb():
    """CLIP image embeddings of every cutout (screen/emb.npz), for the linear probe and the prompt groups in the fit stage."""
    f = SC / 'emb.npz'
    have = dict(zip(np.load(f)['keys'], np.load(f)['vecs'])) if f.exists() else {}
    clip = Grey()
    todo = [t for t in labelled_items() if t[0] not in have][:LIMIT]
    print(len(todo), 'to embed,', len(have), 'done', flush=True)
    def save():
        np.savez(f, keys=np.array(list(have)), vecs=np.array(list(have.values())), text=clip.t, names=np.array(clip.names))
    for n in range(0, len(todo), 16):
        batch = todo[n:n + 16]
        for t, row in zip(batch, clip.embed([t[2] for t in batch])):
            have[t[0]] = row
        if n % 160 == 0:
            save()
            print(n + len(batch), '/', len(todo), flush=True)
    save()

# ---------------------------------------------------------------- the fit stage
def cand_measures(feat):
    """candidates.py's own measures of the chosen photo (pose, sharpness, room below the chin), added in place."""
    for k, f in feat.items():
        cf = D / 'cand' / f"{k.split('@')[0]}.json"
        c = next((c for c in json.loads(cf.read_text(encoding='utf8')).get('cands', []) if c['file'] == f['file']), {}) if cf.exists() else {}
        f.update({'yaw': abs(c['yaw']) if c.get('yaw') is not None else None, 'roll': abs(c['roll']) if c.get('roll') is not None else None,
                  'sharp': np.log1p(c['sharp']) if c.get('sharp') else None, 'share': c.get('share'), 'room': c.get('room'), 'cx': c.get('cx')})

NUM = ['yaw', 'roll', 'sharp', 'share', 'room', 'cx', 'area', 'stray', 'blobs', 'holes', 'soft', 'top', 'sideL', 'sideR', 'floor', 'edge', 'faces', 'noface', 'fx', 'fy', 'fh', 'blur',
       'kit', 'train', 'dress', 'other', 'srcface', 'srcmin', 'after', 'before', 'id_med', 'id_max', 'id_coh', 'id_n']

def matrix(feat, keys, med):
    X = np.array([[float(feat[k].get(c)) if feat[k].get(c) is not None else med[c] for c in NUM] for k in keys])
    return X

def robust(feat_all, labelled_ok):
    """Medians of his approved cutouts (what a good one looks like) and their spread, per measure."""
    good = [feat_all[k] for k in labelled_ok]
    med, mad = {}, {}
    for c in NUM:
        v = np.array([g[c] for g in good if g.get(c) is not None], float)
        med[c] = float(np.median(v)) if len(v) else 0.0
        mad[c] = float(np.median(np.abs(v - med[c])) * 1.4826) if len(v) else 1.0
    return med, mad

def logreg(X, y, lam=1.0, it=400):
    """L2 logistic regression by Newton steps (numpy only). Returns (w, b)."""
    Xb = np.hstack([X, np.ones((len(X), 1))])
    w = np.zeros(Xb.shape[1])
    reg = lam * np.eye(len(w)); reg[-1, -1] = 0
    wt = np.where(y == 1, 0.5 / max(y.mean(), 1e-3), 0.5 / max(1 - y.mean(), 1e-3)) / 1.0   # balance the classes
    for _ in range(25):
        p = 1 / (1 + np.exp(-Xb @ w))
        g = Xb.T @ (wt * (p - y)) + reg @ w
        H = (Xb * (wt * p * (1 - p))[:, None]).T @ Xb + reg
        w -= np.linalg.solve(H, g)
    return w

def predict(w, X):
    return 1 / (1 + np.exp(-(np.hstack([X, np.ones((len(X), 1))]) @ w)))

def auc(y, s):
    pos, neg = s[y == 1], s[y == 0]
    return float(np.mean([(p > neg).mean() + 0.5 * (p == neg).mean() for p in pos])) if len(pos) and len(neg) else float('nan')

def tag_rules(f, med, mad, th):
    """{tag: why} for one item from its measures. th = thresholds (fitted on the training split)."""
    t = {}
    if f['noface'] or f['faces'] > 1:
        t['crop'] = 'no face found' if f['noface'] else 'second face in the cutout'
    if f['train'] > th['train'] and f['train'] > f['kit']:
        t['training'] = f"looks like training kit ({f['train']:.2f})"
    if f['dress'] + f['other'] > th['notkit']:
        t['notkit'] = f"smart or casual clothes, not kit ({f['cliptop']})"
    if f['other'] > th['other']:
        t['unusable'] = f"mural, statue or sign? ({f['cliptop']})"
    srcface = f.get('srcface') or 0
    if srcface < th['face'] or (f['blur'] and f['blur'] < th['blur']):
        t['lowq'] = f"source face {srcface}px, blur {f['blur']:.1f}"
    dev = max(abs(f['fx'] - med['fx']) / max(mad['fx'], 0.02), abs(f['fy'] - med['fy']) / max(mad['fy'], 0.02), abs(f['fh'] - med['fh']) / max(mad['fh'], 0.02))
    if f['top'] > 0.02 or f['floor'] < 0.12 or dev > th['dev']:
        t.setdefault('crop', 'head cut off' if f['top'] > 0.02 else 'floating' if f['floor'] < 0.12 else 'face off the usual place or size')
    if f['stray'] > th['stray'] or f['holes'] > th['holes'] or f['soft'] > th['soft'] or f['edge'] > checks.MAX_EDGE or f['blobs'] > 1:
        t['messy'] = 'stray blobs, holes or fuzzy mask'
    if f.get('id_n', 0) >= 2 and f.get('id_med') is not None and f['id_med'] < th['id'] and (f.get('id_coh') or 0) > f['id_med'] + 0.1:
        t['nothim'] = f"face matches his other photos {f['id_med']:.2f} (they match each other {f['id_coh']:.2f})"
    if f.get('after') is not None and f['after'] > th['old']:
        t['old'] = f"photo {f['after']} years after his career ended"
    return t

DEFAULT_TH = {'train': 0.5, 'notkit': 0.1, 'other': 0.3, 'face': 80, 'blur': 3.5, 'dev': 4.0, 'stray': 0.01, 'holes': 0.005, 'soft': 0.35, 'id': 0.2, 'old': 3}

def prf(tp, fp, fn):
    return (tp / (tp + fp) if tp + fp else float('nan')), (tp / (tp + fn) if tp + fn else float('nan'))

def load_emb():
    f = SC / 'emb.npz'
    if not f.exists():
        return {}, None, None
    z = np.load(f)
    return dict(zip(z['keys'], z['vecs'])), z['text'], list(z['names'])

class Model:
    """Ridge logistic regression on standardised measures, plus the CLIP embedding (a linear probe) when use_emb."""
    def __init__(self, Xf, E, y, lam, use_feat=True, use_emb=False):
        self.use_feat, self.use_emb = use_feat, use_emb and E is not None
        self.mu, self.sd = Xf.mean(0), Xf.std(0) + 1e-6
        if self.use_emb:
            self.em, self.es = E.mean(0), E.std(0) + 1e-6
        self.w = logreg(self.block(Xf, E), y, lam)

    def block(self, Xf, E):
        parts = []
        if self.use_feat:
            parts.append((Xf - self.mu) / self.sd)
        if self.use_emb:
            parts.append((E - self.em) / self.es)
        return np.hstack(parts)

    def __call__(self, Xf, E):
        return predict(self.w, self.block(Xf, E))

CONFIGS = {'measures': dict(lam=8.0), 'probe': dict(lam=300.0, use_feat=False, use_emb=True), 'measures+probe': dict(lam=150.0, use_emb=True)}

def oof(Xf, E, y, cfg, reps=4, seed=3):
    """Mean out-of-fold score per cutout over `reps` random 5-fold splits: every score is from a model that never saw that cutout."""
    rng = np.random.default_rng(seed)
    out = np.zeros(len(y))
    for _ in range(reps):
        order = rng.permutation(len(y))
        for f in np.array_split(order, 5):
            tr = np.setdiff1d(np.arange(len(y)), f)
            out[f] += Model(Xf[tr], E[tr] if E is not None else None, y[tr], **cfg)(Xf[f], E[f] if E is not None else None) / reps
    return out

def at_rate(y, s, rate):
    """Precision and recall when the top `rate` of cards by score are flagged."""
    n = max(int(round(rate * len(y))), 1)
    top = np.argsort(-s)[:n]
    tp = int(y[top].sum())
    return tp / n, tp / max(int(y.sum()), 1)

def run_fit():
    feat = json.loads(FEAT.read_text(encoding='utf8'))
    cand_measures(feat)
    emb, text, names = load_emb()
    for k, g in zip(emb, group_probs(np.array(list(emb.values())), text, names)) if emb else []:   # the prompt groups, from the embeddings
        if k in feat:
            feat[k].update(g)
    items = {t[0]: t for t in labelled_items()}
    keys = [k for k in feat if k in items and items[k][4] is not None]
    y = np.array([items[k][4] for k in keys])
    base = float(y.mean())
    print(f'labelled and measured: {len(keys)} ({int(y.sum())} wrong, {int((1 - y).sum())} approved; {base:.0%} wrong)')
    have_emb = all(k in emb for k in keys)
    print('CLIP embeddings:', 'yes' if have_emb else 'missing for some (run the emb stage); fitting on measures only')
    med, mad = robust(feat, [k for k in keys if items[k][4] == 0])
    Xf = matrix(feat, keys, med)
    E = np.array([emb[k] for k in keys]) if have_emb else None

    print('\nHELD OUT, every card scored by a model that never saw it (5-fold, mean of 4 random splits):')
    print(f'  {"model":16} {"AUC":>5} {"top 10%: prec/rec":>19} {"top 20%":>14} {"top 30%":>14}   (a random flag has precision {base:.2f})')
    scores = {}
    for name, cfg in CONFIGS.items():
        if cfg.get('use_emb') and E is None:
            continue
        s = oof(Xf, E, y, cfg)
        scores[name] = s
        pr = [at_rate(y, s, r) for r in (0.1, 0.2, 0.3)]
        print(f'  {name:16} {auc(y, s):5.2f} ' + ' '.join(f'{p:9.2f} /{r:5.2f}' for p, r in pr))
    best = max(scores, key=lambda n: auc(y, scores[n]))
    print(f'  best by AUC: {best} (picked on these same cards, so its numbers are a little optimistic)')

    # One plain split as well: fit on 60%, test on the other 40%.
    rng = np.random.default_rng(7)
    idx = rng.permutation(len(keys))
    tr, te = idx[:int(0.6 * len(keys))], idx[int(0.6 * len(keys)):]
    m = Model(Xf[tr], E[tr] if E is not None else None, y[tr], **CONFIGS[best])
    s_te = m(Xf[te], E[te] if E is not None else None)
    p20, r20 = at_rate(y[te], s_te, 0.2)
    print(f'  single 60/40 split with {best}: AUC {auc(y[te], s_te):.2f} on {len(te)} cards ({int(y[te].sum())} wrong); flag the top 20%: precision {p20:.2f}, recall {r20:.2f}')

    # Where to draw the line on the page: the score that catches 60% of his wrong cards out of fold.
    s = scores[best]
    thr = float(np.quantile(s[y == 1], 0.4))
    flag = s >= thr
    print(f'  suspect line {thr:.2f} (out of fold): flags {flag.mean():.0%} of cards, precision {y[flag].mean():.2f}, recall {flag[y == 1].mean():.2f}')

    # Tags. The rules have fixed thresholds (no fitting), so they are scored on all labelled cards. He marked "wrong", not why.
    th = dict(DEFAULT_TH)
    tg = {k: tag_rules(feat[k], med, mad, th) for k in keys}
    reading = json.loads((HERE / 'screen_reading.json').read_text(encoding='utf8'))['tags']
    ids = [k.split('@')[0] for k in keys]
    print('\nTAGS (rules, fixed thresholds, all labelled cards). Precision = share of tagged cards he marked wrong; "my reading" recall = share')
    print('of the wrong cards I read as that reason (screen_reading.json) that carry the tag. Soft tags ship, so approved cards carrying them are expected.')
    print(f'  {"tag":9} {"fired":>5} {"wrong fired":>12} {"approved fired":>15} {"precision":>10}   my-reading recall')
    for tag in TAGS:
        fl = np.array([tag in tg[k] for k in keys])
        tp, fp = int((fl & (y == 1)).sum()), int((fl & (y == 0)).sum())
        mine = [i for i, k in enumerate(keys) if y[i] == 1 and ids[i] in reading.get(tag, [])]
        rec = f'{int(fl[mine].sum())}/{len(mine)}' if mine else 'no cards read'
        prec = tp / fl.sum() if fl.sum() else float('nan')
        print(f'  {tag:9} {int(fl.sum()):5d} {tp:7d}/{int(y.sum()):<4d} {fp:9d}/{int((1 - y).sum()):<5d} {prec:10.2f}   {rec}')
    blk = np.array([any(t not in SOFT for t in tg[k]) for k in keys])
    print(f'  any blocking tag: fires on {int(blk.sum())} of {len(keys)}; precision {y[blk].mean():.2f}, recall {blk[y == 1].mean():.2f}')

    # Confirmed tags from review (marks.tags) give real per-tag numbers once there are some.
    confirmed = load('marks.json', {}).get('tags', {})
    print(f"\nHis confirmed tags so far: {len(confirmed)} cards (the page pre-fills the screen's guesses, which biases per-tag numbers taken from them)")

    # Per-tag probes, trained on the tags he has confirmed (marks.tags): used instead of the rule for any tag with enough examples.
    probes = {}
    if E is not None and confirmed:
        ck = {(i + '@rej' if i + '@rej' in feat else i): t for i, t in confirmed.items() if (i + '@rej' in feat or i in feat)}
        kk = [k for k in keys if k not in ck] + list(ck)   # approved ones count as "no tag" besides the ones he confirmed
        Xk, Ek = matrix(feat, kk, med), np.array([emb[k] for k in kk])
        for tag in TAGS:
            yt = np.array([float(tag in ck.get(k, [])) for k in kk])
            if yt.sum() >= 12 and (1 - yt).sum() >= 12:
                a = auc(yt, oof(Xk, Ek, yt, CONFIGS['measures+probe'], reps=2))
                print(f'  tag probe {tag}: {int(yt.sum())} positives, held-out AUC {a:.2f}' + ('' if a >= 0.7 else ' (too weak: the rule stays)'))
                if a >= 0.7:
                    probes[tag] = Model(Xk, Ek, yt, **CONFIGS['measures+probe'])

    # Final: fit on everything he decided, then score every measured cutout.
    final = Model(Xf, E, y, **CONFIGS[best])
    res = {}
    for k, f in feat.items():
        if k not in items or k.endswith('@rej') or (final.use_emb and k not in emb):
            continue
        p = float(final(matrix(feat, [k], med), emb[k][None] if E is not None else None)[0])
        t = tag_rules(f, med, mad, th)
        for tag, pm in probes.items():
            hit = float(pm(matrix(feat, [k], med), emb[k][None])[0]) >= 0.5
            t.pop(tag, None)
            if hit:
                t[tag] = 'learned from your tags'
        suspect = p   # no lift from the rules: their precision (about 0.3) is well below the model's at the line (about 0.5)
        # A tag is only suggested on a suspect: on the rest the rules are wrong more often than right.
        res[items[k][1]] = {'suspect': round(min(1.0, suspect), 3), 'tags': [x for x in TAGS if x in t] if suspect >= thr else [], 'why': t}
    (D / 'screen.json').write_text(json.dumps({'cut': round(thr, 3), 'model': best, 'items': res}), encoding='utf8')
    n_sus = sum(r['suspect'] >= thr for r in res.values())
    print(f'\nscreen.json: {len(res)} cutouts, model {best}; {n_sus} suspects ({n_sus / max(len(res), 1):.0%}), {sum(bool(r["tags"]) for r in res.values())} with suggested tags')

if __name__ == '__main__':
    {'features': run_features, 'emb': run_emb, 'fit': run_fit}[STAGE]()
