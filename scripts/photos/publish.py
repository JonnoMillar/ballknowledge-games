"""Photo pipeline step 5: copy the CHECKED cutouts into the site and record them.

Usage: python publish.py <dir>
Only photos Jonno has checked ship (docs/photo-pipeline.md, 2026-11-05):
  - <dir>/approved.json: ids whose first cutout (out/<id>.0.webp) he approved on /photo-check;
  - <dir>/choices.json: {id: k | "kit"} from /photo-pick, k = the alternative he picked.
A player marked wrong (marks.json) with no pick, and anyone nobody has checked yet, gets the kit card.

Writes public/portraits/<id>.webp and updates data/portraits.json (source "processed", with the source
file, its year and, for a photo found outside Commons, its origin). Run `npm run fetch:credits`
afterwards for data/credits.json.
"""
import json, shutil, sys
from pathlib import Path

D = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / 'public' / 'portraits'
PUB.mkdir(parents=True, exist_ok=True)

def load(name, empty):
    f = D / name
    return json.loads(f.read_text(encoding='utf8')) if f.exists() else empty

approved = set(load('approved.json', []))
choices = load('choices.json', {})
marks = load('marks.json', {'wrong': [], 'flagged': []})
wrong = set(marks['wrong']) | set(marks['flagged'])
portraits = json.loads((ROOT / 'data' / 'portraits.json').read_text(encoding='utf8'))
players = json.loads((D / 'players.json').read_text(encoding='utf8'))
counts = {'processed': 0, 'kit': 0}

for p in players:
    pid = p['id']
    status_file = D / 'out' / f'{pid}.json'
    if not status_file.exists():
        continue
    st = json.loads(status_file.read_text(encoding='utf8'))
    keep = {k: v for k, v in portraits.get(pid, {}).items() if k == 'career'}
    want = choices.get(pid)
    results = st.get('results', []) if st.get('ok') else []
    if isinstance(want, int) and 0 <= want < len(results):
        k = want
    elif want is None and results and pid in approved and pid not in wrong:
        k = 0
    else:
        k = None
    if k is None:
        portraits[pid] = {'source': 'none', 'reason': 'kit card: no checked photo', **keep}
        counts['kit'] += 1
        continue
    r = results[k]
    shutil.copyfile(D / 'out' / f"{pid}.{r['k']}.webp", PUB / f'{pid}.webp')
    rec = {'source': 'processed', 'url': f'/portraits/{pid}.webp', 'file': r['file'].removeprefix('File:'), 'year': r.get('year'), **keep}
    if r.get('origin'):   # a photo from outside Commons (Openverse): where it came from
        rec['origin'] = r['origin']
    portraits[pid] = rec
    counts['processed'] += 1

(ROOT / 'data' / 'portraits.json').write_text(json.dumps(portraits, ensure_ascii=False), encoding='utf8')
print(counts)
