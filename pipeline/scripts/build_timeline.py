from __future__ import annotations

import calendar
import csv
import json
from datetime import date, timedelta

import geopandas as gpd
import numpy as np
from affine import Affine

from build_sar_layers import (
    DEFICIT_NDVI,
    DEFICIT_PCT,
    DEFICIT_SOIL,
    EXCESSIVE_INCREASE_PP,
    GCOV,
    MULTILOOK,
    NDVI,
    SME2,
    UTM,
    WATER_HH_DB,
    coarse_stat,
    multilook_db,
    nearest_file,
    read_db,
    water_polygons,
    zonal_mean,
    zone_index,
)
from build_showcase import MIN_WATER_HA, WATER_SMOOTH_M, smooth, to_features, write
from config import BASIN_ID, DATA, NISAR_DATES, NISAR_TIMELINE, PUBLIC_DATA

OUT = PUBLIC_DATA / "sar_timeline.json"
RAIN_7D_MAX = 20.0
SMAP_MAX = 0.40


def iso(d: str) -> str:
    return f"{d[:4]}-{d[4:6]}-{d[6:]}"


def rnd(v: float, d: int = 1) -> float | None:
    return None if not np.isfinite(v) else round(float(v), d)


def rain_sum(rain: dict, end: date, days: int) -> float | None:
    vals = [rain.get((end - timedelta(days=i)).isoformat()) for i in range(days)]
    return None if any(v is None or v < 0 for v in vals) else round(sum(vals), 1)


def smap_near(d: date) -> float | None:
    rows = list(csv.DictReader(open(DATA / "smap" / "smap_humedad_diaria.csv")))
    best = None
    for r in rows:
        gap = abs((date.fromisoformat(r["fecha"]) - d).days)
        vals = [float(v) for v in (r["humedad_am_m3m3"], r["humedad_pm_m3m3"]) if v]
        if vals and gap <= 2 and (best is None or gap < best[0]):
            best = (gap, max(vals))
    return round(best[1], 2) if best else None


def conditions(d: date, hist: dict) -> dict:
    rain = hist["daily_mm"]
    r7, r12 = rain_sum(rain, d, 7), rain_sum(rain, d, 12)
    smap = smap_near(d)
    month_days = [v for k, v in rain.items() if k.startswith(d.isoformat()[:7]) and v >= 0]
    clim = hist["climatology_mm_day"][str(d.month)] * calendar.monthrange(d.year, d.month)[1]
    return {
        "rain_7d_mm": r7,
        "rain_12d_mm": r12,
        "smap_m3m3": smap,
        "reliable": not ((r7 or 0) > RAIN_7D_MAX or (smap or 0) > SMAP_MAX),
        "month_rain_mm": round(sum(month_days), 1),
        "month_climatology_mm": round(clim, 1),
    }


def status(water: float, ref: float, soil: float, ndvi: float, reliable: bool) -> str:
    if not reliable:
        return "inconclusive"
    if np.isfinite(water) and water - (ref if np.isfinite(ref) else 0) >= EXCESSIVE_INCREASE_PP:
        return "excessive"
    dry = (np.isfinite(soil) and soil < DEFICIT_SOIL) or (np.isfinite(ndvi) and ndvi < DEFICIT_NDVI)
    if (not np.isfinite(water) or water < DEFICIT_PCT) and dry:
        return "deficit"
    return "normal"


def main() -> None:
    if not NISAR_TIMELINE:
        raise SystemExit(f"{BASIN_ID} no tiene fechas de línea de tiempo en config.py")
    raw = json.loads((PUBLIC_DATA / "sar_irrigation_anomalies.geojson").read_text(encoding="utf-8"))
    zones = gpd.GeoDataFrame.from_features(
        [f for f in raw["features"] if f["properties"]["basin_id"] == BASIN_ID], crs="EPSG:4326"
    ).to_crs(UTM)
    n = len(zones)
    series = {pid: [] for pid in zones["parcel_id"]}
    area = zones.union_all()
    water_features = []
    hist = json.loads((DATA / "power" / "lluvia_historica.json").read_text(encoding="utf-8"))
    reference = NISAR_DATES["base"]
    cond, ref_water = {}, None

    for d in sorted(NISAR_TIMELINE, key=lambda x: x != reference):
        hh, tf, _ = read_db(GCOV / "timeline" / f"{d}_HHHH_db.tif")
        hv, _, _ = read_db(GCOV / "timeline" / f"{d}_HVHV_db.tif")
        ml_hh, ml_hv = multilook_db(hh), multilook_db(hv)
        ml_tf = tf * Affine.scale(MULTILOOK)
        idx = zone_index(zones, ml_hh.shape, ml_tf, all_touched=False)
        mask = water_polygons(ml_hh < WATER_HH_DB, ml_tf, iso(d))
        mask["geometry"] = mask.geometry.intersection(area).apply(lambda g: smooth(g, WATER_SMOOTH_M))
        mask = mask[~mask.is_empty & (mask.area / 10_000 >= MIN_WATER_HA)]
        mask["basin_id"], mask["date"] = BASIN_ID, iso(d)
        water_features += to_features(mask[["basin_id", "date", "geometry"]])
        water = zonal_mean((ml_hh < WATER_HH_DB).astype("float64"), idx, n) * 100
        with np.errstate(invalid="ignore", divide="ignore"):
            hv_db = 10 * np.log10(zonal_mean(np.power(10.0, ml_hv / 10), idx, n))
        ndvi_file = nearest_file(NDVI, "ndvi_*.tif", date.fromisoformat(iso(d)))
        ndvi = coarse_stat(ndvi_file[0], zones) if ndvi_file else np.full(n, np.nan)
        sm_file = nearest_file(SME2, "soil_moisture_*.tif", date.fromisoformat(iso(d)))
        soil = coarse_stat(sm_file[0], zones) if sm_file and abs((sm_file[1] - date.fromisoformat(iso(d))).days) <= 6 else np.full(n, np.nan)
        if ref_water is None:
            ref_water = water
        c = cond[iso(d)] = conditions(date.fromisoformat(iso(d)), hist)
        official = iso(d) == iso(NISAR_DATES["actual"])
        for i, pid in enumerate(zones["parcel_id"]):
            z = zones.iloc[i]
            if official:
                water[i], ndvi[i], soil[i] = (np.nan if v is None else v for v in (z["irrigated_area_pct"], z["ndvi"], z["soil_moisture_m3m3"]))
            series[pid].append({
                "date": iso(d),
                "water_pct": rnd(water[i]),
                "hv_db": rnd(hv_db[i]),
                "ndvi": rnd(ndvi[i], 2),
                "soil_moisture_m3m3": rnd(soil[i], 2),
                "status": z["status"] if official else status(water[i], ref_water[i], soil[i], ndvi[i], c["reliable"]),
            })
        print(f"  {iso(d)}: {c} · NDVI {ndvi_file[0].name if ndvi_file else '—'}")
    for pid in series:
        series[pid].sort(key=lambda p: p["date"])

    wpath = PUBLIC_DATA / "sar_water_timeline.geojson"
    wraw = json.loads(wpath.read_text(encoding="utf-8")) if wpath.exists() else {"type": "FeatureCollection", "features": []}
    write(wpath.name, wraw, water_features)
    data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    data[BASIN_ID] = {
        "dates": [iso(d) for d in NISAR_TIMELINE],
        "reference_date": iso(reference),
        "climatology_period": hist["climatology_period"],
        "conditions": cond,
        "zones": series,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{BASIN_ID}: línea de tiempo de {n} zonas en {len(NISAR_TIMELINE)} fechas → {OUT.name}")


if __name__ == "__main__":
    main()
