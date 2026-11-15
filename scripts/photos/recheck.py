"""Run checks.py over cutouts made before the checks existed.

Usage: python recheck.py <dir> [--dry]
A failing player's out/<id>.* files move to <dir>/rej/ and <dir>/bad/<id>.json lists the rejected
Commons file, so `cutout.py` redoes him with the next candidate. A player whose cutout failed
before has his uncut `photo` dropped (kit card instead).
"""
import json, shutil, sys
from pathlib import Path
import cv2
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
import checks

D = Path(sys.argv[1])
dry = '--dry' in sys.argv
det = cv2.FaceDetectorYN.create(str(D.parent / 'models' / 'yunet.onnx'), '', (440, 440), 0.6)
clip = checks.Clip()
names = {p['id']: p['name'] for p in json.loads((D / 'players.json').read_text(encoding='utf8'))}
bad = 0
for st_file in sorted((D / 'out').glob('Q*.json')):
    pid = st_file.stem
    st = json.loads(st_file.read_text(encoding='utf8'))
    if 'rejected' in st:   # made by the new cutout.py: already checked
        continue
    if not st['ok']:
        if st.get('photo') and not dry:
            st['photo'] = None
            st_file.write_text(json.dumps(st))
        continue
    why, measures = checks.crop_verdict(Image.open(D / 'out' / f'{pid}.0.webp'), det, clip)
    if not why:
        st['rejected'] = []
        if not dry:
            st_file.write_text(json.dumps(st))
        continue
    bad += 1
    print(f"{names.get(pid, pid)}: {why} {measures}")
    if dry:
        continue
    (D / 'rej').mkdir(exist_ok=True)
    (D / 'bad').mkdir(exist_ok=True)
    (D / 'bad' / f'{pid}.json').write_text(json.dumps([r['file'] for r in st['results'][:1]]))
    for f in (D / 'out').glob(f'{pid}.*'):
        shutil.move(str(f), D / 'rej' / f.name)
print(bad, 'rejected')
