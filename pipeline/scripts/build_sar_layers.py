"""
Convierte los rasters NASA (NISAR GCOV + SME2, VIIRS NDVI) en las capas del visor:

  public/data/sar_water_mask_baseline.geojson   agua superficial en la escena base
  public/data/sar_water_mask_current.geojson    agua superficial en la escena actual
  public/data/sar_irrigation_anomalies.geojson  métricas SAR por parcela (necesita --parcels)

Uso (desde pipeline/scripts):
  ../.venv/Scripts/python build_sar_layers.py --parcels ../data/parcelas/maate_cobertura_2022.shp
  ../.venv/Scripts/python build_sar_layers.py --masks-only

Las parcelas pueden venir en .shp, .gpkg, .geojson o .zip (shapefile comprimido), en cualquier CRS.
Si el archivo tiene la columna `cbn1` (capa MAATE), se filtra a TIERRA AGROPECUARIA.

Los datos de otras cuencas (p. ej. santa-elena) que ya estén en los GeoJSON se conservan.
Formato de salida: pipeline/README.md (sección "Formato de salida")
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from rasterio import features
from shapely.geometry import box, shape

from config import BASIN_ID, BBOX, DATA, PUBLIC_DATA

# ---------------------------------------------------------------------------
# Parámetros ajustables (ver data/nisar/gcov/README.md)
# ---------------------------------------------------------------------------
UTM = "EPSG:32717"
MULTILOOK = 5  # 10 m × 5 = 50 m: reduce el speckle antes de umbralizar
WATER_HH_DB = -18.0  # HH < -18 dB → agua libre o lámina de riego
MIN_WATER_HA = 1.0  # manchas de agua más chicas se descartan
MIN_PARCEL_HA = 5.0  # parcelas más chicas se descartan
COMMERCIAL_HA = 50.0  # ≥ 50 ha → finca comercial; si no, pequeño productor
EXCESSIVE_PCT = 30.0  # ≥ 30 % de la parcela con agua en época seca → exceso
DEFICIT_PCT = 5.0  # < 5 % con agua...
DEFICIT_SOIL = 0.22  # ...y humedad SME2 < 0.22 m³/m³ o NDVI < 0.35 → déficit
DEFICIT_NDVI = 0.35
SIMPLIFY_M = 15  # tolerancia de simplificación de geometrías

STATUS_LABELS = {
    "excessive": "Exceso de agua superficial detectado",
    "normal": "Riego dentro de lo esperado",
    "deficit": "Déficit hídrico / suelo seco",
}

GCOV = DATA / "nisar" / "gcov"
SME2 = DATA / "nisar" / "sme2"
NDVI = DATA / "ndvi"


# ---------------------------------------------------------------------------
# Rasters
# ---------------------------------------------------------------------------
def read_db(path: Path) -> tuple[np.ndarray, Affine, rasterio.crs.CRS]:
    with rasterio.open(path) as src:
        return src.read(1).astype("float64"), src.transform, src.crs


def multilook_db(db: np.ndarray, k: int = MULTILOOK) -> np.ndarray:
    """Promedia bloques k×k en escala LINEAL (nunca en dB) y devuelve dB."""
    lin = np.power(10.0, db / 10.0)
    h, w = (lin.shape[0] // k) * k, (lin.shape[1] // k) * k
    blocks = lin[:h, :w].reshape(h // k, k, w // k, k)
    with np.errstate(invalid="ignore", divide="ignore"):
        valid = np.isfinite(blocks).sum(axis=(1, 3))
        mean = np.nanmean(blocks, axis=(1, 3))
        mean[valid < (k * k) // 2] = np.nan  # menos de la mitad válida → sin dato
        return 10.0 * np.log10(mean)


def water_polygons(mask: np.ndarray, transform: Affine, scene: str) -> gpd.GeoDataFrame:
    pixel_ha = abs(transform.a * transform.e) / 10_000
    min_pixels = max(1, int(round(MIN_WATER_HA / pixel_ha)))
    clean = features.sieve(mask.astype("uint8"), size=min_pixels, connectivity=8)
    geoms = [shape(g) for g, v in features.shapes(clean, mask=clean == 1, transform=transform) if v == 1]
    gdf = gpd.GeoDataFrame({"scene": [scene] * len(geoms)}, geometry=geoms, crs=UTM)
    gdf["area_ha"] = gdf.area / 10_000
    gdf = gdf[gdf["area_ha"] >= MIN_WATER_HA].copy()
    gdf["geometry"] = gdf.simplify(SIMPLIFY_M, preserve_topology=True)
    return gdf


# ---------------------------------------------------------------------------
# Parcelas
# ---------------------------------------------------------------------------
def load_parcels(path: Path) -> gpd.GeoDataFrame:
    bbox_ll = gpd.GeoSeries([box(*BBOX)], crs="EPSG:4326")
    src = f"zip://{path}" if path.suffix.lower() == ".zip" else str(path)
    gdf = gpd.read_file(src, bbox=bbox_ll)
    if gdf.empty:
        raise SystemExit(f"No hay polígonos de {path.name} dentro del bbox {BBOX}")
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    cols = {c.lower(): c for c in gdf.columns}

    if "cbn1" in cols:  # capa MAATE de cobertura
        before = len(gdf)
        gdf = gdf[gdf[cols["cbn1"]].astype(str).str.upper().str.contains("AGROPECUARI", na=False)]
        print(f"  MAATE: {len(gdf)} de {before} polígonos son TIERRA AGROPECUARIA")

    gdf = gdf.to_crs(UTM)
    gdf = gpd.clip(gdf, gpd.GeoSeries([box(*BBOX)], crs="EPSG:4326").to_crs(UTM))
    gdf = gdf.explode(index_parts=False)
    gdf = gdf[gdf.geometry.geom_type == "Polygon"].copy()
    gdf["area_ha"] = gdf.area / 10_000
    gdf = gdf[gdf["area_ha"] >= MIN_PARCEL_HA].copy()
    gdf["geometry"] = gdf.simplify(SIMPLIFY_M, preserve_topology=True)
    gdf = gdf.sort_values("area_ha", ascending=False).reset_index(drop=True)

    def col(name: str) -> str | None:
        return cols.get(name)

    ids, names, crops, zones = [], [], [], []
    for i, row in gdf.iterrows():
        n = i + 1
        ids.append(str(row[col("parcel_id")]) if col("parcel_id") else f"AGRO_{BASIN_ID.upper()}_{n:04d}")
        names.append(str(row[col("name")]) if col("name") else f"Unidad agrícola {n:03d}")
        crop = row[col("crop")] if col("crop") else (row[col("cbn2")] if col("cbn2") else "Agropecuario")
        crops.append(str(crop).strip().capitalize())
        if col("zone_type") and row[col("zone_type")] in ("commercial_farm", "smallholder", "community"):
            zones.append(row[col("zone_type")])
        else:
            zones.append("commercial_farm" if row["area_ha"] >= COMMERCIAL_HA else "smallholder")
    gdf["parcel_id"], gdf["name"], gdf["crop"], gdf["zone_type"] = ids, names, crops, zones
    return gdf[["parcel_id", "name", "crop", "zone_type", "area_ha", "geometry"]]


def zone_index(parcels: gpd.GeoDataFrame, shape_: tuple[int, int], transform: Affine, all_touched: bool) -> np.ndarray:
    """Raster con el índice (1..n) de la parcela en cada píxel; 0 = fuera."""
    pairs = ((geom, i + 1) for i, geom in enumerate(parcels.geometry))
    return features.rasterize(pairs, out_shape=shape_, transform=transform, fill=0, all_touched=all_touched, dtype="int32")


def zonal_mean(values: np.ndarray, zones: np.ndarray, n: int) -> np.ndarray:
    ok = np.isfinite(values) & (zones > 0)
    sums = np.bincount(zones[ok], weights=values[ok], minlength=n + 1)
    counts = np.bincount(zones[ok], minlength=n + 1)
    with np.errstate(invalid="ignore", divide="ignore"):
        return (sums / counts)[1:]


def coarse_stat(path: Path, parcels: gpd.GeoDataFrame) -> np.ndarray:
    """Media por parcela en un raster grueso (SME2, NDVI), en su propio CRS."""
    with rasterio.open(path) as src:
        arr = src.read(1).astype("float64")
        if src.nodata is not None and np.isfinite(src.nodata):
            arr[arr == src.nodata] = np.nan
        local = parcels.to_crs(src.crs)
        zones = zone_index(local, arr.shape, src.transform, all_touched=True)
        out = zonal_mean(arr, zones, len(local))
        # Parcelas sin píxel propio: valor en el centroide
        for i in np.where(~np.isfinite(out))[0]:
            c = local.geometry.iloc[i].centroid
            r, k = src.index(c.x, c.y)
            if 0 <= r < arr.shape[0] and 0 <= k < arr.shape[1]:
                out[i] = arr[r, k]
        return out


def nearest_file(folder: Path, pattern: str, target: date, before_only: bool = False) -> tuple[Path, date] | None:
    best = None
    for p in folder.glob(pattern):
        m = re.search(r"(\d{4})-?(\d{2})-?(\d{2})", p.stem)
        if not m:
            continue
        d = date(int(m[1]), int(m[2]), int(m[3]))
        if before_only and d > target:
            continue
        if best is None or abs((d - target).days) < abs((best[1] - target).days):
            best = (p, d)
    return best


# ---------------------------------------------------------------------------
# Salida
# ---------------------------------------------------------------------------
def to_features(gdf: gpd.GeoDataFrame) -> list[dict]:
    ll = gdf.to_crs("EPSG:4326")
    data = json.loads(ll.to_json(drop_id=True))

    def rnd(coords):
        if isinstance(coords[0], (int, float)):
            return [round(coords[0], 6), round(coords[1], 6)]
        return [rnd(c) for c in coords]

    for f in data["features"]:
        f["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"])
    return data["features"]


def merge_write(path: Path, new_features: list[dict]) -> None:
    """Reemplaza las features de esta cuenca y conserva las de otras cuencas."""
    keep = []
    if path.exists():
        old = json.loads(path.read_text(encoding="utf-8"))
        keep = [f for f in old.get("features", []) if f.get("properties", {}).get("basin_id") != BASIN_ID]
    fc = {"type": "FeatureCollection", "features": new_features + keep}
    path.write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"  ✔ {path.name}: {len(new_features)} features de {BASIN_ID} ({path.stat().st_size / 1024:.0f} KB)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--parcels", type=Path, help="Polígonos de parcelas (MAATE u otros)")
    ap.add_argument("--masks-only", action="store_true", help="Solo genera las máscaras de agua")
    ap.add_argument("--out", type=Path, default=PUBLIC_DATA, help="Carpeta de salida (por defecto public/data)")
    args = ap.parse_args()
    if not args.masks_only and not args.parcels:
        ap.error("indica --parcels <archivo> o usa --masks-only")
    args.out.mkdir(parents=True, exist_ok=True)

    manifest = json.loads((DATA / "nisar" / "manifest.json").read_text(encoding="utf-8"))
    base_d, act_d = manifest["gcov"]["base"]["date"], manifest["gcov"]["actual"]["date"]
    iso = lambda s: f"{s[:4]}-{s[4:6]}-{s[6:]}"  # noqa: E731
    print(f"NISAR GCOV base {iso(base_d)} → actual {iso(act_d)} (multilook {MULTILOOK * 10} m)")

    hh_base, tf, crs = read_db(GCOV / f"base_{base_d}_HHHH_db.tif")
    hh_act, tf_act, _ = read_db(GCOV / f"actual_{act_d}_HHHH_db.tif")
    if hh_base.shape != hh_act.shape or tf != tf_act or str(crs) != UTM:
        raise SystemExit("Las escenas base y actual no comparten grilla/CRS")

    ml_base, ml_act = multilook_db(hh_base), multilook_db(hh_act)
    ml_tf = tf * Affine.scale(MULTILOOK)
    pixel_ha = abs(ml_tf.a * ml_tf.e) / 10_000
    water_base, water_act = ml_base < WATER_HH_DB, ml_act < WATER_HH_DB
    print(f"  Agua HH < {WATER_HH_DB} dB: {water_base.sum() * pixel_ha:,.0f} ha → {water_act.sum() * pixel_ha:,.0f} ha")

    parcels = None
    if not args.masks_only:
        print(f"Parcelas: {args.parcels}")
        parcels = load_parcels(args.parcels)
        print(f"  {len(parcels)} parcelas ≥ {MIN_PARCEL_HA} ha, {parcels['area_ha'].sum():,.0f} ha en total")

    # --- Máscaras de agua ---
    agri = parcels.union_all() if parcels is not None else None
    for mask, scene, fname in ((water_base, "baseline", "sar_water_mask_baseline.geojson"), (water_act, "current", "sar_water_mask_current.geojson")):
        polys = water_polygons(mask, ml_tf, scene)
        polys["basin_id"] = BASIN_ID
        polys["water_class"] = (
            np.where(polys.intersects(agri), "irrigation", "surface_water") if agri is not None else "surface_water"
        )
        polys["area_ha"] = polys["area_ha"].round(2)
        merge_write(args.out / fname, to_features(polys[["basin_id", "scene", "water_class", "area_ha", "geometry"]]))

    if parcels is None:
        return

    # --- Estadísticas por parcela ---
    n = len(parcels)
    zones = zone_index(parcels, ml_act.shape, ml_tf, all_touched=False)
    lin = lambda db: np.power(10.0, db / 10.0)  # noqa: E731
    db = lambda v: 10.0 * np.log10(v)  # noqa: E731
    with np.errstate(invalid="ignore", divide="ignore"):
        act_db = db(zonal_mean(lin(ml_act), zones, n))
        base_db = db(zonal_mean(lin(ml_base), zones, n))
    water_act_pct = zonal_mean(water_act.astype("float64"), zones, n) * 100
    water_base_pct = zonal_mean(water_base.astype("float64"), zones, n) * 100

    act_date = date.fromisoformat(iso(act_d))
    sm_file = nearest_file(SME2, "soil_moisture_*.tif", act_date)
    ndvi_file = nearest_file(NDVI, "ndvi_*.tif", act_date, before_only=True)
    soil = coarse_stat(sm_file[0], parcels) if sm_file else np.full(n, np.nan)
    ndvi = coarse_stat(ndvi_file[0], parcels) if ndvi_file else np.full(n, np.nan)
    print(f"  SME2: {sm_file[0].name if sm_file else '—'} · NDVI: {ndvi_file[0].name if ndvi_file else '—'}")

    def status(i: int) -> str:
        w = water_act_pct[i]
        if np.isfinite(w) and w >= EXCESSIVE_PCT:
            return "excessive"
        dry = (np.isfinite(soil[i]) and soil[i] < DEFICIT_SOIL) or (np.isfinite(ndvi[i]) and ndvi[i] < DEFICIT_NDVI)
        if (not np.isfinite(w) or w < DEFICIT_PCT) and dry:
            return "deficit"
        return "normal"

    f = lambda v, d=1: None if not np.isfinite(v) else round(float(v), d)  # noqa: E731
    parcels = parcels.copy()
    parcels["basin_id"] = BASIN_ID
    parcels["area_hectares"] = parcels["area_ha"].round(1)
    parcels["irrigated_area_pct"] = [f(v) for v in water_act_pct]
    parcels["irrigated_area_ha"] = [f(a * (w if np.isfinite(w) else 0) / 100) for a, w in zip(parcels["area_ha"], water_act_pct)]
    parcels["baseline_water_pct"] = [f(v) for v in water_base_pct]
    parcels["sar_backscatter_db"] = [f(v) for v in act_db]
    parcels["sar_delta_db"] = [f(a - b) for a, b in zip(act_db, base_db)]
    parcels["soil_moisture_m3m3"] = [f(v, 2) for v in soil]
    parcels["ndvi"] = [f(v, 2) for v in ndvi]
    parcels["status"] = [status(i) for i in range(n)]
    parcels["status_label"] = parcels["status"].map(STATUS_LABELS)
    parcels["observation_date"] = iso(act_d)
    parcels["baseline_date"] = iso(base_d)
    parcels["sensor"] = "NISAR L2 GCOV (HH, 50 m)"

    out_cols = [
        "parcel_id", "name", "basin_id", "zone_type", "crop", "area_hectares", "irrigated_area_pct", "irrigated_area_ha",
        "baseline_water_pct", "sar_backscatter_db", "sar_delta_db", "soil_moisture_m3m3", "ndvi", "status",
        "status_label", "observation_date", "baseline_date", "sensor", "geometry",
    ]
    merge_write(args.out / "sar_irrigation_anomalies.geojson", to_features(parcels[out_cols]))

    counts = parcels["status"].value_counts().to_dict()
    total_irr = sum(v or 0 for v in parcels["irrigated_area_ha"])
    print(f"  Estado: {counts} · área con agua en parcelas: {total_irr:,.0f} ha")


if __name__ == "__main__":
    main()
