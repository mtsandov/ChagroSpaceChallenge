import base64
import csv
import io
import json
import netrc
import os
import time
import urllib.request
from collections import defaultdict
from datetime import datetime

from config import BBOX, DATA, END, POINT, START

API = "https://appeears.earthdatacloud.nasa.gov/api/v1"
PRODUCT = "SPL3SMP_E.006"
LAYERS = {
    "Soil_Moisture_Retrieval_Data_AM_soil_moisture": "humedad_am_m3m3",
    "Soil_Moisture_Retrieval_Data_PM_soil_moisture_pm": "humedad_pm_m3m3",
}


def call(path, token=None, data=None, basic=None, raw=False):
    req = urllib.request.Request(f"{API}/{path}", data=None if data is None else json.dumps(data).encode())
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if basic:
        req.add_header("Authorization", "Basic " + base64.b64encode(basic.encode()).decode())
        req.method = "POST"
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read()
    return body if raw else json.loads(body)


user, _, pwd = netrc.netrc().authenticators("urs.earthdata.nasa.gov")
token = call("login", basic=f"{user}:{pwd}")["token"]

xmin, ymin, xmax, ymax = BBOX
coords = [{"id": "centro", "latitude": POINT[0], "longitude": POINT[1]}] + [
    {"id": f"p{i}", "latitude": la, "longitude": lo}
    for i, (la, lo) in enumerate([(ymax, xmin), (ymax, xmax), (ymin, xmin), (ymin, xmax)])
]
fmt = lambda d: datetime.strptime(d, "%Y-%m-%d").strftime("%m-%d-%Y")
task = {
    "task_type": "point",
    "task_name": "chagro_smap",
    "params": {
        "dates": [{"startDate": fmt(START), "endDate": fmt(END)}],
        "layers": [{"product": PRODUCT, "layer": l} for l in LAYERS],
        "coordinates": coords,
    },
}
task_id = os.environ.get("APPEEARS_TASK") or call("task", token=token, data=task)["task_id"]
print("AppEEARS task", task_id)

while True:
    st = call(f"task/{task_id}", token=token)["status"]
    if st == "done":
        break
    if st in ("error", "expired"):
        raise SystemExit(f"AppEEARS: {st}")
    time.sleep(20)

files = call(f"bundle/{task_id}", token=token)["files"]
f = next(x for x in files if x["file_name"].endswith("results.csv"))
text = call(f"bundle/{task_id}/{f['file_id']}", token=token, raw=True).decode()
(DATA / "smap" / "appeears_raw.csv").write_text(text)

acc = defaultdict(lambda: defaultdict(list))
for row in csv.DictReader(io.StringIO(text)):
    for col, v in row.items():
        for layer, name in LAYERS.items():
            if col.endswith(layer) and v not in ("", None):
                val = float(v)
                if val >= 0:
                    acc[row["Date"]][name].append(val)

rows = []
for d in sorted(acc):
    r = {"fecha": d}
    for name in LAYERS.values():
        vals = acc[d][name]
        r[name] = round(sum(vals) / len(vals), 4) if vals else None
    rows.append(r)

with open(DATA / "smap" / "smap_humedad_diaria.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=["fecha", *LAYERS.values()])
    w.writeheader()
    w.writerows(rows)
print(f"SMAP: {len(rows)} días con dato")
