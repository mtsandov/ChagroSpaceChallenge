import json

from config import BASIN_ID, DATA, ELEVATION_M, POINT, PUBLIC_DATA

FIELDS = ["T2M_MAX", "T2M_MIN", "T2MDEW", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "PS", "PRECTOTCORR"]

raw = json.loads((DATA / "power" / "power_raw.json").read_text())
power = json.loads((DATA / "power" / "power_diario.json").read_text())
fc = json.loads((DATA / "geosfp" / "pronostico_diario.json").read_text())

coords = raw.get("geometry", {}).get("coordinates", [])
elevation = coords[2] if len(coords) > 2 and coords[2] not in (None, -999) else ELEVATION_M

basin = {
    "source": "NASA POWER daily point API",
    "community": "AG",
    "units": {k: raw["parameters"][k]["units"] for k in FIELDS},
    "location": {"lat": POINT[0], "lng": POINT[1], "elevation_m": elevation},
    "daily": [{"date": d["date"], **{k: d[k] for k in FIELDS}} for d in power],
    "forecast": {
        "source": f"NASA GMAO GEOS-FP (corrida {fc['corrida']})",
        "daily": fc["daily"],
    },
}

path = PUBLIC_DATA / "weather_daily.json"
dataset = json.loads(path.read_text()) if path.exists() else {}
dataset[BASIN_ID] = basin
path.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n")
print(f"weather_daily.json: {BASIN_ID} con {len(basin['daily'])} días + {len(fc['daily'])} de pronóstico")
