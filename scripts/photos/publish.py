"""Photo pipeline step 5: copy the chosen cutouts into the site and record them.

Usage: python publish.py <dir> [choices.json]
Reads <dir>/out/<id>.json and <id>.<k>.webp (cutout.py) and <dir>/players.json. `choices.json` is
{id: k | "photo" | "kit"} from the approval rounds: which alternative to ship (k, 0 = the ranking's
pick), the best uncut photo, or the kit card. Without a choice a player gets k = 0, else the uncut
photo, else the kit card.

Writes public/portraits/<id>.webp and updates data/portraits.json (source "processed", with the Commons
file it came from). Run `npm run fetch:credits` afterwards for data/credits.json.
"""
import json, shutil, sys, urllib.parse
from pathlib import Path

D = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / 'public' / 'portraits'
PUB.mkdir(parents=True, exist_ok=True)
choices = json.loads(Path(sys.argv[2]).read_text(encoding='utf8')) if len(sys.argv) > 2 else {}
portraits = json.loads((ROOT / 'data' / 'portraits.json').read_text(encoding='utf8'))
players = json.loads((D / 'players.json').read_text(encoding='utf8'))
counts = {'processed': 0, 'photo': 0, 'kit': 0}

def commons_url(file, width=400):
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(file.removeprefix('File:')) + f'?width={width}'

for p in players:
    pid = p['id']
    status_file = D / 'out' / f'{pid}.json'
    if not status_file.exists():
        continue
    st = json.loads(status_file.read_text(encoding='utf8'))
    want = choices.get(pid)
    keep = {k: v for k, v in portraits.get(pid, {}).items() if k == 'career'}
    year = lambda f: next((c['year'] for c in json.loads((D / 'cand' / f'{pid}.json').read_text(encoding='utf8'))['cands'] if c['file'] == f), None)
    if want == 'kit' or (want is None and not st['ok'] and not st.get('photo')):
        portraits[pid] = {'source': 'none', 'reason': 'kit card: no good photo', **keep}
        counts['kit'] += 1
    elif st['ok'] and want in (None, *range(len(st['results']))):
        r = st['results'][want or 0]
        shutil.copyfile(D / 'out' / f"{pid}.{r['k']}.webp", PUB / f'{pid}.webp')
        portraits[pid] = {'source': 'processed', 'url': f'/portraits/{pid}.webp', 'file': r['file'].removeprefix('File:'),
                          'year': r['year'], **keep}
        counts['processed'] += 1
    elif st.get('photo'):
        portraits[pid] = {'source': 'commons', 'url': commons_url(st['photo']), 'file': st['photo'].removeprefix('File:'),
                          'year': year(st['photo']), **keep}
        counts['photo'] += 1
    else:
        portraits[pid] = {'source': 'none', 'reason': 'kit card: no good photo', **keep}
        counts['kit'] += 1

(ROOT / 'data' / 'portraits.json').write_text(json.dumps(portraits, ensure_ascii=False), encoding='utf8')
print(counts)
