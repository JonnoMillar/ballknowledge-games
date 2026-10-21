"""Photo ranking v2 (round 1 lessons, docs/photo-pipeline.md). Pure functions: no network, no images.

A candidate carries year, p18, face (px), sharp (Laplacian variance of the face), share (face
height / photo height) and the face's pose from YuNet's landmarks: yaw (nose off the eye line,
in eye distances), roll (degrees), cx (face centre across the frame, 0-1).
"""
import math, re, time

THIS_YEAR = time.gmtime().tm_year
MIN_SHARP = 80      # gate: blurrier than this is soft, not just "less sharp"
FACE_CAP = 150      # px: face size stops earning past this
PRIME_SIGMA = 7.0   # years

# Log-linear weights. Fitted on round 1 (conditional logit over the six photos Jonno saw, leave-one-out
# 12-13 of 27) then rounded and shrunk. Sharpness weighs ~0 once the gate is passed: his picks are no
# sharper than the alternatives (he beat 50% of them on it). Tight head-and-shoulders framing (share)
# and a face that looks at the camera, centred, are what his picks have in common.
W = dict(face=0.8, share=1.5, p18=1.0, dy=-1.0, yaw=-0.9, roll=-0.4, cx=-2.0, sharp=0.1)

def from_why(c):
    """Features from a stored round-1 candidate: its `why` string plus the pose fields."""
    m = re.search(r'face (\d+)px, (\d+)% of height, sharpness (\d+)', c['why'])
    if not m:
        return None
    return {'year': c['year'], 'p18': c['p18'], 'face': int(m[1]), 'share': int(m[2]) / 100, 'sharp': int(m[3]),
            'yaw': c.get('yaw', 0), 'roll': c.get('roll', 0), 'cx': c.get('cx', 0.5)}

def span_and_prime(stints, signature=None, fallback=None):
    """((first, last) playing year, prime year). A last spell with no `to` that is not a loan means
    still playing: the span runs to this year. Prime = middle of the signature-club spell, else of
    the career. `stints` is data/careers.json's list for the player."""
    stints = stints or []
    if not stints:
        return (tuple(fallback), sum(fallback) / 2) if fallback else (None, None)
    last = stints[-1]
    ys = [s['from'] for s in stints if 'from' in s] + [s['to'] for s in stints if 'to' in s]
    first, end = min(ys), max(ys)
    if 'to' not in last and not last.get('loan'):
        end = THIS_YEAR
    mine = [s for s in stints if s.get('q') == signature and 'from' in s]
    if mine:
        prime = (min(s['from'] for s in mine) + max(s.get('to', THIS_YEAR) for s in mine)) / 2
    else:
        prime = (first + end) / 2
    return (first, end), prime

def score(f, prime):
    """Higher is better; None when the sharpness gate fails."""
    if f['sharp'] < MIN_SHARP:
        return None
    x = dict(face=min(f['face'], FACE_CAP) / FACE_CAP,
             share=min(f['share'], 0.35) / 0.35,
             p18=float(f['p18']),
             dy=min(abs(f['year'] - prime), 12) / 12 if prime else 0,
             yaw=abs(f['yaw']), roll=abs(f['roll']) / 10, cx=abs(f['cx'] - 0.5) * 2,
             sharp=min(math.log(f['sharp'] / MIN_SHARP), 4))
    return math.exp(sum(W[k] * v for k, v in x.items()))
