import csv
import json
import urllib.request

from config import DATA, END, POINT, START

PARAMS = [
    "T2M_MAX",
    "T2M_MIN",
    "T2MDEW",
    "RH2M",
    "WS2M",
    "ALLSKY_SFC_SW_DWN",
    "PS",
    "PRECTOTCORR",
    "EVPTRNS",
]

url = (
    "https://power.larc.nasa.gov/api/temporal/daily/point"
    f"?parameters={','.join(PARAMS)}&community=AG"
    f"&latitude={POINT[0]}&longitude={POINT[1]}"
    f"&start={START.replace('-', '')}&end={END.replace('-', '')}&format=JSON"
)

with urllib.request.urlopen(url, timeout=120) as r:
    raw = json.load(r)

out = DATA / "power"
(out / "power_raw.json").write_text(json.dumps(raw, indent=1))

p = raw["properties"]["parameter"]
units = {k: v["units"] for k, v in raw["parameters"].items()}
days = sorted(p[PARAMS[0]].keys())
rows = [{"date": f"{d[:4]}-{d[4:6]}-{d[6:]}", **{k: p[k][d] for k in PARAMS}} for d in days]

(out / "power_diario.json").write_text(json.dumps(rows, indent=1))
with open(out / "power_diario.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)
print(f"POWER: {len(rows)} días -> {out}")
print("Unidades:", units)
