"""Keeps the photo pipeline running and writes a heartbeat.

python watchdog.py   (launch detached: see docs/photo-pipeline.md "Starting and watching the jobs")
Runs cand_drive.py (candidates: the redo list, then everyone, most viewed first) and drive.py 1 (one
cutout process; rembg wants ~2.8 GB). A child that dies is restarted after a minute (a candidates run
that finishes cleanly is left alone). Every minute it appends one line to heartbeat.log: time, counts,
cutouts written in the last hour, top-500 progress, free RAM, whether each child is alive.
"""
import ctypes, json, subprocess, sys, time
from datetime import datetime
from pathlib import Path

D = Path(__file__).parent
NO_WINDOW = 0x08000000

class MEM(ctypes.Structure):
    _fields_ = [('len', ctypes.c_ulong), ('load', ctypes.c_ulong), ('total', ctypes.c_ulonglong), ('avail', ctypes.c_ulonglong),
                ('pt', ctypes.c_ulonglong), ('pa', ctypes.c_ulonglong), ('vt', ctypes.c_ulonglong), ('va', ctypes.c_ulonglong), ('ve', ctypes.c_ulonglong)]

def free_mb():
    m = MEM()
    m.len = ctypes.sizeof(MEM)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return int(m.avail / 2**20)

CHILDREN = {'cand': ['cand_drive.py'], 'cut': ['drive.py', '1']}
procs, started, done_clean = {}, {}, set()

def launch(name):
    args = CHILDREN[name]
    procs[name] = subprocess.Popen([sys.executable, '-X', 'utf8', str(D / args[0]), *args[1:]], cwd=D, creationflags=NO_WINDOW,
                                   stdout=subprocess.DEVNULL, stderr=open(D / 'watchdog.err', 'a'))
    started[name] = time.time()

def counts():
    players = json.loads((D / 'players.json').read_text(encoding='utf8'))
    out = {p.stem: p for p in (D / 'out').glob('Q*.json')}
    now = time.time()
    top = [p['id'] for p in players[:500]]
    return {
        'cand': sum(1 for _ in (D / 'cand').glob('Q*.json')),
        'out': len(out),
        'cut_1h': sum(1 for p in out.values() if now - p.stat().st_mtime < 3600),
        'top500_done': sum(1 for i in top if i in out),
        'top500_cutout': sum(1 for i in top if i in out and json.loads(out[i].read_text(encoding='utf8')).get('ok')),
        'players': len(players),
    }

while True:
    for name in CHILDREN:
        p = procs.get(name)
        if p is not None and p.poll() is not None and p.returncode == 0 and name == 'cand':
            done_clean.add(name)
        if name in done_clean:
            continue
        if p is None or (p.poll() is not None and time.time() - started[name] > 60):
            launch(name)
    try:
        c = counts()
    except Exception as e:   # a file mid-write: skip this beat
        c = {'error': str(e)[:60]}
    alive = {n: (procs[n].poll() is None) for n in procs}
    with open(D / 'heartbeat.log', 'a', encoding='utf8') as f:
        f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S} {json.dumps(c)} free_mb={free_mb()} alive={json.dumps(alive)} cand_done={'cand' in done_clean}\n")
    time.sleep(60)
