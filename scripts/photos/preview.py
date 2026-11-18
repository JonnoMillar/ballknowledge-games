"""Preview crops of every realistic candidate photo, for Jonno to choose from BEFORE anything is cut out (/photo-choose).

Usage: python preview.py <dir> [ids.json ...]     (default: focus-gaps.json and marked.json)
For each player: every candidate from cand/<id>.json that a cutout could be made from (a face found, not mush, at least
MIN_HEADS face heights of photo below the face top, not a statue/card/render by its file name, not a file he already
rejected) is cropped the way cutout.py frames it (square, 3.2 face heights, from 0.55 above the face) and saved as
pre/<id>/<n>.jpg; pre/<id>.json lists them best first. A re-pick's photo on the site now comes first, marked current.
Cutting out costs 20-50 s a photo; a preview costs milliseconds, so he sees them all and only his choice is cut
(chosen.json, cutout.py). Docs: docs/photo-pipeline.md, "Choose before cutting".
"""
import json, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
import rank

MIN_HEADS = 2.0     # as cutout.py: less photo than this below the face top and the cutout floats
SIDE = 320

def crop_box(w, h, box, side=3.2, above=0.55):
    x, y, fw, fh = box
    top = max(int(y - above * fh), 0)
    s = int(min(side * fh, w, h - top))
    left = int(min(max(x + fw / 2 - s / 2, 0), w - s))
    return left, top, left + s, top + s

def realistic(c, banned):
    return (c.get('box') and c.get('room', 0) >= MIN_HEADS and c['file'] not in banned and not rank.NOT_A_PHOTO.search(c['file'])
            and (not c.get('gate') or c['gate'].startswith('profile')))

def build(D: Path, pid: str, current: str | None = None) -> int:
    cf = D / 'cand' / f'{pid}.json'
    if not cf.exists():
        return 0
    cands = json.loads(cf.read_text(encoding='utf8'))['cands']
    banned = set(json.loads((D / 'bad' / f'{pid}.json').read_text(encoding='utf8'))) if (D / 'bad' / f'{pid}.json').exists() else set()
    banned.discard(current)
    # Before candidates.py numbered Openverse photos past the Commons ones, an Openverse jpg could overwrite a Commons
    # candidate's file: the file on disk is the Openverse photo, so the Commons entry (its box from another picture) is dropped.
    taken = {c['local'] for c in cands if c.get('origin')}
    cands = [c for c in cands if c.get('origin') or c.get('local') not in taken]
    keep = sorted((c for c in cands if realistic(c, banned)), key=lambda c: (c['file'] != current, bool(c.get('gate')), -c.get('score', 0)))
    out, folder = [], D / 'pre' / pid
    folder.mkdir(parents=True, exist_ok=True)
    for c in keep:
        n = Path(c['local']).stem
        try:
            im = Image.open(D / c['local']).convert('RGB')
        except OSError:
            continue
        im.crop(crop_box(im.width, im.height, c['box'])).resize((SIDE, SIDE), Image.LANCZOS).save(folder / f'{n}.jpg', quality=85)
        o = c.get('origin') or {}
        out.append({'n': n, 'file': c['file'], 'year': c.get('year'), 'face': c.get('face'), 'sharp': c.get('sharp'),
                    'source': o.get('source') or 'commons', **({'current': True} if c['file'] == current else {}),
                    **({'note': 'profile'} if c.get('gate') else {})})
    (D / 'pre' / f'{pid}.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf8')
    return len(out)

if __name__ == '__main__':
    D = Path(sys.argv[1])
    lists = sys.argv[2:] or ['focus-gaps.json', 'marked.json']
    ids = list(dict.fromkeys(i for f in lists if (D / f).exists() for i in json.loads((D / f).read_text(encoding='utf8'))))
    portraits = json.loads((Path(__file__).resolve().parents[2] / 'data' / 'portraits.json').read_text(encoding='utf8'))
    repick = set(json.loads((D / 'repick.json').read_text(encoding='utf8'))) if (D / 'repick.json').exists() else set()
    counts = [build(D, pid, ('File:' + portraits[pid]['file']) if pid in repick and portraits.get(pid, {}).get('file') else None) for pid in ids]
    print(len(ids), 'players,', sum(counts), 'previews;', sum(c == 0 for c in counts), 'with none')
