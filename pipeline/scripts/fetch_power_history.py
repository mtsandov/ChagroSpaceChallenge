import json
import urllib.request

from config import DATA, END, NISAR_TIMELINE, POINT

BASE = "https://power.larc.nasa.gov/api/temporal"
LOC = f"community=AG&latitude={POINT[0]}&longitude={POINT[1]}&format=JSON"


def get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=120) as r:
        return json.load(r)


start = f"{min(NISAR_TIMELINE)[:6]}01" if NISAR_TIMELINE else END.replace("-", "")[:6] + "01"
daily = get(f"{BASE}/daily/point?parameters=PRECTOTCORR&{LOC}&start={start}&end={END.replace('-', '')}")
clim = get(f"{BASE}/climatology/point?parameters=PRECTOTCORR&{LOC}")

rain = {f"{d[:4]}-{d[4:6]}-{d[6:]}": v for d, v in daily["properties"]["parameter"]["PRECTOTCORR"].items()}
months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
monthly = {i + 1: clim["properties"]["parameter"]["PRECTOTCORR"][m] for i, m in enumerate(months)}

out = DATA / "power" / "lluvia_historica.json"
out.write_text(json.dumps({
    "daily_mm": rain,
    "climatology_mm_day": monthly,
    "climatology_period": clim.get("header", {}).get("range") or f"{clim['header'].get('start')}-{clim['header'].get('end')}",
}, indent=1))
print(f"POWER lluvia: {len(rain)} días desde {start}, climatología {monthly} mm/día -> {out}")
