import csv
import json
import math
import re
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta

from config import DATA, ELEVATION_M, POINT

BASE = "https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/fcast"
HOURS = 72
FETCH_HOURS = 96
LOCAL_OFFSET = timedelta(hours=-5)
COLLECTIONS = {
    "tavg1_2d_flx_Nx": ["prectot", "evap"],
    "tavg1_2d_rad_Nx": ["swgdn"],
    "tavg1_2d_slv_Nx": ["t2m", "qv2m", "u2m", "v2m", "ps"],
}


def get(url, tries=8):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                txt = r.read().decode()
            if "GrADS Data Server - error" in txt:
                raise urllib.error.URLError("GrADS error")
            return txt
        except (urllib.error.URLError, TimeoutError):
            if i == tries - 1:
                raise
            time.sleep(10 * (i + 1))


def latest_run():
    common = None
    for coll in COLLECTIONS:
        runs = set(re.findall(rf"{coll}\.(\d{{8}}_\d{{2}})", get(f"{BASE}/{coll}")))
        common = runs if common is None else common & runs
    for run in sorted(common, reverse=True):
        dds = get(f"{BASE}/tavg1_2d_flx_Nx/tavg1_2d_flx_Nx.{run}.dds")
        if int(re.search(r"time = (\d+)", dds).group(1)) >= FETCH_HOURS:
            return run


def parse_ascii(txt, var):
    block = txt.split(f"{var}, [")[1]
    vals = re.findall(r"\]\[\d+\], ([-\d.Ee+]+)", block.split("\n\n\n")[0])
    return [float(v) for v in vals]


def es(t):
    return 0.6108 * math.exp(17.27 * t / (t + 237.3))


def et0_fao56(tmax, tmin, rs, u2, ea, p_kpa, lat_deg, doy, z):
    """
    Penman-Monteith FAO-56 diario (Allen et al. 1998), misma formulación que
    src/lib/agro/penmanMonteith.ts: Rn = Rns − Rnl, albedo 0.23, Rso con elevación.
    Entradas: °C, MJ/m²/día, m/s, kPa, grados, día juliano, m s.n.m.
    """
    tmean = (tmax + tmin) / 2
    es_mean = (es(tmax) + es(tmin)) / 2
    delta = 4098 * es(tmean) / (tmean + 237.3) ** 2
    gamma = 0.000665 * p_kpa
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi * doy / 365)
    dec = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)
    ws = math.acos(-math.tan(phi) * math.tan(dec))
    ra = 24 * 60 / math.pi * 0.082 * dr * (ws * math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.sin(ws))
    rso = (0.75 + 2e-5 * z) * ra
    rns = (1 - 0.23) * rs
    rnl = 4.903e-9 * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2 * (0.34 - 0.14 * math.sqrt(ea)) * (1.35 * min(rs / rso, 1) - 0.35)
    rn = rns - rnl
    et0 = (0.408 * delta * rn + gamma * 900 / (tmean + 273) * u2 * (es_mean - ea)) / (delta + gamma * (1 + 0.34 * u2))
    return max(et0, 0)


lat_i = round((POINT[0] + 90) / 0.25)
lon_i = round((POINT[1] + 180) / 0.3125)
run = latest_run()
series, times = {}, None

CHUNK = 24
for coll, vars_ in COLLECTIONS.items():
    for v in vars_:
        series[v], tvals = [], []
        for a in range(0, FETCH_HOURS, CHUNK):
            b = min(a + CHUNK, FETCH_HOURS) - 1
            txt = get(f"{BASE}/{coll}/{coll}.{run}.ascii?{v}[{a}:{b}][{lat_i}][{lon_i}],time[{a}:{b}]")
            series[v] += parse_ascii(txt, v)
            tvals += re.search(r"time, \[\d+\]\n(.+)", txt).group(1).split(", ")
        if times is None:
            times = [datetime(1, 1, 1) + timedelta(minutes=round((float(x) - 2) * 1440)) for x in tvals]
        print(f"  {v} OK", flush=True)

rows = []
for i in range(FETCH_HOURS):
    q, p = series["qv2m"][i], series["ps"][i]
    rows.append({
        "hora_utc": times[i].strftime("%Y-%m-%dT%H:%MZ"),
        "lluvia_mm_h": round(series["prectot"][i] * 3600, 3),
        "evaporacion_mm_h": round(series["evap"][i] * 3600, 3),
        "radiacion_w_m2": round(series["swgdn"][i], 1),
        "temp_c": round(series["t2m"][i] - 273.15, 2),
        "viento_2m_ms": round(math.hypot(series["u2m"][i], series["v2m"][i]), 2),
        "presion_vapor_kpa": round(q * p / (0.622 + 0.378 * q) / 1000, 3),
        "presion_kpa": round(p / 1000, 2),
    })

by_day = {}
for i, r in enumerate(rows):
    by_day.setdefault((times[i] + LOCAL_OFFSET).date().isoformat(), []).append(r)

daily = []
for d, hs in by_day.items():
    if len(hs) != 24:
        continue
    mean = lambda k: sum(h[k] for h in hs) / 24
    tmax, tmin = max(h["temp_c"] for h in hs), min(h["temp_c"] for h in hs)
    et0 = et0_fao56(tmax, tmin, mean("radiacion_w_m2") * 0.0864, mean("viento_2m_ms"), mean("presion_vapor_kpa"),
                    mean("presion_kpa"), POINT[0], date.fromisoformat(d).timetuple().tm_yday, ELEVATION_M)
    daily.append({
        "date": d,
        "temperature_2m_max": round(tmax, 1),
        "temperature_2m_min": round(tmin, 1),
        "precipitation_sum": round(sum(h["lluvia_mm_h"] for h in hs), 1),
        "precipitation_probability_max": None,
        "et0_fao_evapotranspiration": round(et0, 2),
    })
daily = daily[:3]
rows = rows[:HOURS]

out = DATA / "geosfp"
out.mkdir(parents=True, exist_ok=True)
with open(out / "pronostico_72h.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)
(out / "pronostico_72h.json").write_text(json.dumps({"corrida": run, "horas": rows}, indent=1))
(out / "pronostico_diario.json").write_text(json.dumps({"corrida": run, "zona_horaria": "America/Guayaquil", "daily": daily}, indent=1))
with open(out / "pronostico_diario.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=daily[0].keys())
    w.writeheader()
    w.writerows(daily)
print(f"GEOS-FP corrida {run}: {[(d['date'], d['precipitation_sum'], d['et0_fao_evapotranspiration']) for d in daily]}")
