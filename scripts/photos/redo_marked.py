"""Queue the players Jonno marked wrong (/photo-check, the "Wrong photo" button) for three alternatives.

Usage: python redo_marked.py <dir>
Reads <dir>/marks.json ({wrong, flagged}). For each id not already queued: the cutout he rejected moves
to <dir>/rej/, its Commons file goes in <dir>/bad/<id>.json so it is not picked again, the status file
goes, and the id joins <dir>/marked.json. cutout.py then cuts three alternatives (the next best
candidates that pass the checks) into out/<id>.0-2.webp. Safe to run again: it only adds new marks.
"""
import json, shutil, sys
from pathlib import Path

D = Path(sys.argv[1])
marks = json.loads((D / 'marks.json').read_text(encoding='utf8'))
queued = set(json.loads((D / 'marked.json').read_text(encoding='utf8'))) if (D / 'marked.json').exists() else set()
(D / 'rej').mkdir(exist_ok=True)
(D / 'bad').mkdir(exist_ok=True)
new = 0
for pid in dict.fromkeys(marks['wrong'] + marks['flagged']):
    if pid in queued:
        continue
    st_file = D / 'out' / f'{pid}.json'
    if st_file.exists():
        st = json.loads(st_file.read_text(encoding='utf8'))
        bad_file = D / 'bad' / f'{pid}.json'
        bad = set(json.loads(bad_file.read_text(encoding='utf8'))) if bad_file.exists() else set()
        bad |= {r['file'] for r in st.get('results', [])}
        bad_file.write_text(json.dumps(sorted(bad)))
        for f in (D / 'out').glob(f'{pid}.*'):
            shutil.move(str(f), D / 'rej' / f.name)
    queued.add(pid)
    new += 1
(D / 'marked.json').write_text(json.dumps(sorted(queued)))
print(new, 'players queued,', len(queued), 'in all')
