"""Keeps the photo pipeline running and writes a heartbeat.

python watchdog.py   (launch detached; see docs/photo-pipeline.md "Starting and watching the jobs")
Runs cand_drive.py (candidates: the redo list, then everyone, most viewed first) and drive.py 1 (one
cutout process; rembg wants ~2.8 GB). Every minute it:
  - asks Windows not to sleep while it runs (ES_SYSTEM_REQUIRED): on 2026-11-04/05 Modern Standby froze
    everything for 13 h and 4 h, which looked like a slow search. A closed lid still sleeps the laptop.
  - restarts a child that died, or one that has made no progress for STALL_MIN minutes while there is
    work for it (its whole process tree is killed first);
  - appends a line to heartbeat.log: time, counts, players per hour over the last hour (candidates and
    cutouts), top-500 progress, free RAM, which children are alive, and `slept` when the clock jumped
    since the last beat (the machine was suspended).
Read the rates, not just `alive`: an alive process that writes nothing is a stall.
"""
import ctypes, json, subprocess, sys, time
from collections import deque
from datetime import datetime
from pathlib import Path

D = Path(__file__).parent
NO_WINDOW = 0x08000000
STALL_MIN = {'cand': 20, 'cut': 30}

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
last_progress = {n: time.time() for n in CHILDREN}
last_count = {n: -1 for n in CHILDREN}
history = deque()   # (time, cand, out)
last_beat = time.time()

def launch(name):
    args = CHILDREN[name]
    procs[name] = subprocess.Popen([sys.executable, '-X', 'utf8', str(D / args[0]), *args[1:]], cwd=D, creationflags=NO_WINDOW,
                                   stdout=subprocess.DEVNULL, stderr=open(D / 'watchdog.err', 'a'))
    started[name] = last_progress[name] = time.time()
    last_count[name] = -1

def kill_tree(p):
    subprocess.run(['taskkill', '/T', '/F', '/PID', str(p.pid)], capture_output=True, creationflags=NO_WINDOW)

def counts():
    players = json.loads((D / 'players.json').read_text(encoding='utf8'))
    out = {p.stem: p for p in (D / 'out').glob('Q*.json')}
    cand = {p.stem for p in (D / 'cand').glob('Q*.json')}
    now = time.time()
    top = [p['id'] for p in players[:500]]
    return {
        'cand': len(cand),
        'out': len(out),
        'backlog': len(cand - set(out)),   # candidates found, not yet cut out
        'cut_1h': sum(1 for p in out.values() if now - p.stat().st_mtime < 3600),
        'top500_done': sum(1 for i in top if i in out),
        'top500_cutout': sum(1 for i in top if i in out and json.loads(out[i].read_text(encoding='utf8')).get('ok')),
        'players': len(players),
    }

def per_hour(i):
    """Players per hour over the beats in the last hour (awake time only: a sleep gap is not slow work)."""
    if len(history) < 2:
        return 0
    t0, t1 = history[0], history[-1]
    return round((t1[i] - t0[i]) * 3600 / max(t1[0] - t0[0], 1))

ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001
while True:
    ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
    now = time.time()
    slept = int(now - last_beat) if now - last_beat > 150 else 0
    if slept:   # the clock jumped: do not read the silence as a stall, and drop rates that span it
        history.clear()
        for n in last_progress:
            last_progress[n] = now
    last_beat = now
    try:
        c = counts()
    except Exception as e:   # a file mid-write: skip this beat
        c = {'error': str(e)[:60]}
    if 'out' in c:
        history.append((now, c['cand'], c['out']))
        while history and now - history[0][0] > 3600:
            history.popleft()
        c['cand_per_h'], c['cut_per_h'] = per_hour(1), per_hour(2)
        progress = {'cand': c['cand'], 'cut': c['out']}
        work = {'cand': True, 'cut': c['backlog'] > 0}
    for name in CHILDREN:
        p = procs.get(name)
        if p is not None and p.poll() is not None and p.returncode == 0 and name == 'cand':
            done_clean.add(name)
        if name in done_clean:
            continue
        if 'out' in c and p is not None and p.poll() is None:
            if progress[name] != last_count[name] or not work[name]:
                last_count[name], last_progress[name] = progress[name], now
            elif now - last_progress[name] > STALL_MIN[name] * 60:
                kill_tree(p)
                with open(D / 'watchdog.err', 'a') as f:
                    f.write(f'{datetime.now():%F %T} {name} made no progress for {STALL_MIN[name]} min: killed, restarting\n')
                c['restarted_' + name] = 'stall'
        if p is None or (p.poll() is not None and now - started[name] > 60):
            launch(name)
    alive = {n: (procs[n].poll() is None) for n in procs}
    with open(D / 'heartbeat.log', 'a', encoding='utf8') as f:
        f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S} {json.dumps(c)} free_mb={free_mb()} alive={json.dumps(alive)} cand_done={'cand' in done_clean}"
                f"{f' slept={slept}s' if slept else ''}\n")
    time.sleep(60)
