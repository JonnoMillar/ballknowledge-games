"""Send the players who still have a gap back through the candidate search with the current rules.

Usage: python requeue_gaps.py <dir>      (stop the watchdog first; start it again after)
A gap is a player on the kit card (no cutout), or one Jonno marked wrong whose alternatives number
fewer than three. Their candidates and status move to <dir>/old/ and redo.json lists them, most
viewed first, for cand_drive.py. Run it after changing what candidates.py looks for (2026-11-05: the
manager era, Openverse, the wider Commons search), so the new rules reach the players they were
written for. Players with a good cutout, and marked players who already have three alternatives, stay.
"""
import json, shutil, sys
from pathlib import Path

D = Path(sys.argv[1])
(D / 'old').mkdir(exist_ok=True)
players = json.loads((D / 'players.json').read_text(encoding='utf8'))
marked = set(json.loads((D / 'marked.json').read_text(encoding='utf8'))) if (D / 'marked.json').exists() else set()
redo = []
for p in players:
    pid = p['id']
    status = D / 'out' / f'{pid}.json'
    cand = D / 'cand' / f'{pid}.json'
    st = json.loads(status.read_text(encoding='utf8')) if status.exists() else None
    if pid in marked:   # candidates made under the old rules, or fewer than three alternatives
        gap = cand.exists() if st is None else len(st.get('results', [])) < 3
    else:
        gap = st is not None and not st.get('ok')
    if not gap:
        continue
    redo.append(p)
    if status.exists():
        for f in (D / 'out').glob(f'{pid}.*'):
            shutil.move(str(f), D / 'old' / f'{f.stem}.requeued{f.suffix}')
    if cand.exists():
        shutil.move(str(cand), D / 'old' / f'{pid}.cand.requeued.json')
    if (D / 'cand' / pid).is_dir():
        shutil.rmtree(D / 'cand' / pid)
(D / 'redo.json').write_text(json.dumps(redo), encoding='utf8')
print(len(redo), 'players requeued;', sum(1 for p in redo if p['id'] in marked), 'of them marked wrong')
