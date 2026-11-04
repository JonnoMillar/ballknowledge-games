"""Keep cutting out whatever candidates.py has finished, until every player has an out/<id>.json.
python drive.py [n_procs]  (one is enough: rembg already uses every core)"""
import json, subprocess, sys, time
from pathlib import Path
D = Path(__file__).parent
n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
total = len(json.loads((D / 'players.json').read_text(encoding='utf8')))
while len(list((D / 'out').glob('Q*.json'))) < total:
    ps = [subprocess.Popen([sys.executable, '-X', 'utf8', str(D.parents[1] / 'scripts' / 'photos' / 'cutout.py'), str(D), 'players.json', f'{i}/{n}'],
                           stdout=open(D / f'cut{i}.log', 'a'), stderr=subprocess.STDOUT) for i in range(n)]
    for p in ps:
        p.wait()
    time.sleep(30)
print('finished')
