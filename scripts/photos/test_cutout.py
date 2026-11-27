"""Check cutout.py's choose path with the heavy models stubbed: python -X utf8 scripts/photos/test_cutout.py
(needs .scratch/models/yunet.onnx). A marked player with no choice is not cut; a choice becomes alternative 0 with the
old ones shifted up; a re-pick (approved) keeps its cutout 0 and gets the choice last; a choice is cut once."""
import json, runpy, sys, tempfile, types
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
MODELS = HERE.parents[1] / '.scratch' / 'models'

def fake_remove(im, session=None):   # rembg stand-in: an upright body-shaped matte
    w, h = im.size
    yy, xx = np.mgrid[:h, :w]
    a = (((xx - w / 2) / (w * 0.3)) ** 2 + ((yy - h * 0.75) / (h * 0.6)) ** 2 < 1) | (((xx - w / 2) / 60) ** 2 + ((yy - 230) / 75) ** 2 < 1)
    return Image.fromarray(np.dstack([np.array(im), (a * 255).astype(np.uint8)]))

sys.modules['rembg'] = types.SimpleNamespace(new_session=lambda name: None, remove=fake_remove)
sys.path.insert(0, str(HERE))
import checks
class FakeClip:
    def kit(self, ims):
        return [(0.9, 0.0, 'a footballer in a football shirt')] * len(ims)
checks.Clip = FakeClip

with tempfile.TemporaryDirectory() as t:
    D = Path(t) / 'photo-all'
    (D / 'out').mkdir(parents=True)
    (Path(t) / 'models').mkdir()
    (Path(t) / 'models' / 'yunet.onnx').write_bytes((MODELS / 'yunet.onnx').read_bytes())
    rng = np.random.default_rng(1)
    def cand(pid, files):
        (D / 'cand' / pid).mkdir(parents=True)
        cs = []
        for n, f in enumerate(files):
            Image.fromarray(rng.integers(0, 255, (900, 600, 3), dtype=np.uint8)).save(D / 'cand' / pid / f'{n}.jpg')
            cs.append({'file': f, 'gate': None, 'score': 1.0, 'year': 2020, 'face': 150, 'room': 4.0, 'box': [225, 160, 150, 150], 'local': f'cand/{pid}/{n}.jpg',
                       'sharp': 500, 'share': 0.17, 'yaw': 0, 'roll': 0, 'cx': 0.5, 'p18': False, 'named': True})
        (D / 'cand' / f'{pid}.json').write_text(json.dumps({'span': [2015, 2026], 'prime': 2020, 'cands': cs}))
    def out(pid, files):
        for k, _ in enumerate(files):
            Image.new('RGBA', (440, 440), (k, 0, 0, 255)).save(D / 'out' / f'{pid}.{k}.webp', lossless=True)
        (D / 'out' / f'{pid}.json').write_text(json.dumps({'ok': True, 'results': [{'file': f, 'k': k} for k, f in enumerate(files)]}))
    cand('Q1', ['File:a1.jpg', 'File:a2.jpg'])                       # marked, nothing chosen
    cand('Q2', ['File:b1.jpg', 'File:b2.jpg']); out('Q2', ['File:b1.jpg'])   # has a cutout of b1; he chose b2
    cand('Q3', ['File:c1.jpg', 'File:c2.jpg']); out('Q3', ['File:c1.jpg'])   # approved re-pick; he chose c2
    (D / 'players.json').write_text(json.dumps([{'id': q, 'name': q} for q in ('Q1', 'Q2', 'Q3')]))
    (D / 'marked.json').write_text(json.dumps(['Q1', 'Q2', 'Q3']))
    (D / 'approved.json').write_text(json.dumps(['Q3']))
    (D / 'chosen.json').write_text(json.dumps({'Q2': 'File:b2.jpg', 'Q3': 'File:c2.jpg', 'Q1': 'kit'}))
    sys.argv = ['cutout.py', str(D)]
    runpy.run_path(str(HERE / 'cutout.py'), run_name='__main__')

    assert not (D / 'out' / 'Q1.json').exists(), 'a marked player with no choice must not be cut'
    q2 = json.loads((D / 'out' / 'Q2.json').read_text())['results']
    assert [(r['file'], r['k'], r.get('chosen', False)) for r in q2] == [('File:b2.jpg', 0, True), ('File:b1.jpg', 1, False)], q2
    assert np.array(Image.open(D / 'out' / 'Q2.1.webp'))[0, 0, 0] == 0, 'the old cutout 0 moved to 1'
    q3 = json.loads((D / 'out' / 'Q3.json').read_text())['results']
    assert [(r['file'], r['k']) for r in q3] == [('File:c1.jpg', 0), ('File:c2.jpg', 1)], q3
    assert np.array(Image.open(D / 'out' / 'Q3.0.webp'))[0, 0, 0] == 0, 'the approved cutout 0 is untouched'
    before = (D / 'out' / 'Q2.0.webp').stat().st_mtime_ns
    runpy.run_path(str(HERE / 'cutout.py'), run_name='__main__')   # a second pass cuts nothing again
    assert (D / 'out' / 'Q2.0.webp').stat().st_mtime_ns == before and len(json.loads((D / 'out' / 'Q2.json').read_text())['results']) == 2
print('ok')
