"""Synthetic keyframed recording used by the telemetry viewer."""
import json
from pathlib import Path

DT = 0.05
# time, ten recorded channels, four recorded actuator positions, three display vectors (XY)
KEYS = [
    (0, [-130,1000,8,-48,-.13,.01,500,30,1350,0], [-1,0,.5,-.5], [[0,0],[1,0],[-.2,1]]),
    (10, [-55,540,7,-42,.08,-.02,500,29,1100,0], [-1,0,-.3,.4], [[0,0],[-.5,0],[-.1,.9]]),
    (20, [-10,160,2,-27,-.06,.01,450,28,480,0], [.8,-.3,.2,-.2], [[.2,1],[.2,.1],[0,.5]]),
    (30, [0,0,0,-1,0,0,377,27,1,0], [-1,0,0,0], [[0,0],[0,0],[0,0]]),
]


def frame(index, wind=0.0):
    """Interpolate synthetic telemetry. Commands are recorded step values."""
    t = index * DT
    end = next((i for i in range(1, len(KEYS)) if t < KEYS[i][0]), len(KEYS)-1)
    a, b = KEYS[end-1:end+1]
    u = (t-a[0])/(b[0]-a[0])
    obs = [x+(y-x)*u for x,y in zip(a[1], b[1])]
    obs[-1] = wind
    k = b if u >= 1 else a
    return dict(t=t, obs=obs, action=k[2], vectors=k[3])


if __name__ == "__main__":
    path = Path(__file__).resolve().parents[2] / "public/sample.json"
    path.write_text(json.dumps(dict(dt=DT, keys=KEYS)), encoding="utf8")
