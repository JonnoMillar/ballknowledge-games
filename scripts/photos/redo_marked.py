"""Queue the players Jonno blocked (/photo-check tags, the "Wrong photo" button) for three alternatives.

Usage: python redo_marked.py <dir>
Reads <dir>/marks.json ({wrong, flagged, tags}). For each id not already queued: the cutout he rejected
moves to <dir>/rej/ (it stays there as his label for screen.py), the status file goes, and the id joins
<dir>/marked.json. Then, by his tags:
  - only "Bad crop": the same photo, cropped three other ways (recrop.json, cutout.py): he picks one on /photo-pick;
  - any other blocking tag, or none (the older marks): its Commons file goes in <dir>/bad/<id>.json so it is
    not picked again, and cutout.py cuts the next three candidates that pass the checks, so Low quality,
    the clothing tags, Not him, Messy cutout, Unusable and Too old all mean "the next candidate".
Out/<id>.0-2.webp are the new pictures; nothing ships until he picks one (publish.py). An id he has already
approved is left alone. Safe to run again: it only adds new marks.
"""
import json, shutil, sys
from pathlib import Path

D = Path(sys.argv[1])
marks = json.loads((D / 'marks.json').read_text(encoding='utf8'))
queued = set(json.loads((D / 'marked.json').read_text(encoding='utf8'))) if (D / 'marked.json').exists() else set()
approved = set(json.loads((D / 'approved.json').read_text(encoding='utf8'))) if (D / 'approved.json').exists() else set()
recrop_file = D / 'recrop.json'
recrop = json.loads(recrop_file.read_text(encoding='utf8')) if recrop_file.exists() else {}
SOFT = {'training', 'better'}
(D / 'rej').mkdir(exist_ok=True)
(D / 'bad').mkdir(exist_ok=True)
new = 0
for pid in dict.fromkeys(marks['wrong'] + marks['flagged']):
    if pid in queued or pid in approved:
        continue
    st_file = D / 'out' / f'{pid}.json'
    if st_file.exists():
        st = json.loads(st_file.read_text(encoding='utf8'))
        bad_file = D / 'bad' / f'{pid}.json'
        bad = set(json.loads(bad_file.read_text(encoding='utf8'))) if bad_file.exists() else set()
        blocking = set(marks.get('tags', {}).get(pid, [])) - SOFT
        if blocking == {'crop'} and st.get('results'):
            recrop[pid] = st['results'][0]['file']   # same photo, three crops
        else:
            bad |= {r['file'] for r in st.get('results', [])}
            bad_file.write_text(json.dumps(sorted(bad)))
        for f in (D / 'out').glob(f'{pid}.*'):
            shutil.move(str(f), D / 'rej' / f.name)
    queued.add(pid)
    new += 1
(D / 'marked.json').write_text(json.dumps(sorted(queued)))
recrop_file.write_text(json.dumps(recrop))
print(new, 'players queued,', len(queued), 'in all')
