"""Compare independent Python and JS decoders, including phase transition times."""
import json
from pathlib import Path
import subprocess
from env.booster_recovery_env import frame

root = Path(__file__).resolve().parents[1]
script = """
import {frame} from './src/physics.js';
import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('public/sample.json'));
console.log(JSON.stringify([0,8.5].map(w=>Array.from({length:601},(_,i)=>frame(r,i,w)))));
"""
runs = json.loads(subprocess.check_output(["node","--input-type=module","-e",script],cwd=root))
worst = 0
for wind, rows in zip((0,8.5),runs,strict=True):
    for i, js in enumerate(rows):
        py = frame(i,wind)
        for key in ("obs","action"):
            worst = max(worst, max(abs(a-b) for a,b in zip(py[key],js[key],strict=True)))
        assert js["vectors"] == py["vectors"] and js["t"] == py["t"]
        assert (js["action"][0] < -.2) == (py["action"][0] < -.2)
assert worst <= 1e-14
print(f"1202 playback frames, max absolute difference {worst:g}")
