"""Offline test: does rank.py put Jonno's round-1 picks first? Usage: python -X utf8 -I scripts/photos/test_rank.py [-v]"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import rank
R = Path(__file__).resolve().parents[2]
picks = json.loads((R / 'scripts/photos/round1-picks.json').read_text(encoding='utf8'))
careers = json.loads((R / 'data/careers.json').read_text(encoding='utf8'))['players']
pool = {p['id']: p for p in json.loads((R / 'data/pool.json').read_text(encoding='utf8'))}
SIG = json.loads((R / 'scripts/photos/signature.json').read_text(encoding='utf8')) if (R / 'scripts/photos/signature.json').exists() else {}
verbose = '-v' in sys.argv
first = top3 = n = unseen = 0
for p in picks:
    if not p['picked']:
        continue
    n += 1
    cands = json.loads((R / f"scripts/photos/round1-candidates/{p['id']}.json").read_text(encoding='utf8'))
    span, prime = rank.span_and_prime(careers.get(p['id'], {}).get('stints'), SIG.get(p['id']))
    ranked = []
    for c in cands:
        f = rank.from_why(c)
        s = rank.score(f, prime) if f else None
        if s is not None:
            ranked.append((s, c['file'], f))
    ranked.sort(key=lambda r: -r[0])
    order = [r[1] for r in ranked]
    pos = order.index(p['picked']) + 1 if p['picked'] in order else None
    first += pos == 1
    top3 += bool(pos and pos <= 3)
    unseen += bool(order and order[0] not in p['shown'])
    if verbose or pos != 1:
        top = ranked[0] if ranked else None
        pk = next((r for r in ranked if r[1] == p['picked']), None)
        print(f"{'OK  ' if pos == 1 else 'MISS'} {p['name']:22} pick rank {pos}  prime {prime:.0f}  pick {pk[2] if pk else 'GATED OUT'}  | top {top[1][5:40] if top else None} {top[2] if top else ''}")
print(f'first {first}/{n}   top3 {top3}/{n}   top choice never shown to Jonno: {unseen}')
