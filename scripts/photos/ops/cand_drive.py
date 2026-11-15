"""candidates.py on redo.json (earlier failures, widened search), then on the whole list."""
import subprocess, sys
from pathlib import Path
D = Path(__file__).parent
for lst in ('redo.json', 'players.json'):
    subprocess.run([sys.executable, '-X', 'utf8', str(D.parents[1] / 'scripts' / 'photos' / 'candidates.py'), str(D), lst],
                   stdout=open(D / 'run0.log', 'a'), stderr=open(D / 'run0.err', 'a'))
