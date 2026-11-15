from __future__ import annotations

import argparse
import json
from pathlib import Path

import geopandas as gpd
import numpy as np

from config import BASIN_ID, PUBLIC_DATA

UTM = "EPSG:32717"
COMMERCIAL_HA = 50.0
SMOOTH_M = 60
WEIGHTED = ["baseline_water_pct", "sar_backscatter_db", "sar_delta_db", "soil_moisture_m3m3", "ndvi"]
KEEP = ["status", "status_label", "observation_date", "baseline_date", "sensor", "basin_id"]


def weighted(values: np.ndarray, weights: np.ndarray, digits: int) -> float | None:
    ok = np.isfinite(values)
    if not ok.any():
        return None
    return round(float(np.average(values[ok], weights=weights[ok])), digits)


def smooth(geom):
    rounded = geom.buffer(SMOOTH_M, join_style="round").buffer(-2 * SMOOTH_M, join_style="round").buffer(SMOOTH_M, join_style="round")
    return (rounded if not rounded.is_empty else geom).simplify(10)


def largest(geom):
    return max(geom.geoms, key=lambda g: g.area) if geom.geom_type == "MultiPolygon" else geom


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", type=Path, default=PUBLIC_DATA / "sar_irrigation_anomalies.geojson")
    args = ap.parse_args()

    raw = json.loads(args.file.read_text(encoding="utf-8"))
    mine = [f for f in raw["features"] if f["properties"].get("basin_id") == BASIN_ID]
    others = [f for f in raw["features"] if f["properties"].get("basin_id") != BASIN_ID]
    cells = gpd.GeoDataFrame.from_features(mine, crs="EPSG:4326").to_crs(UTM)
    cells["geometry"] = cells.buffer(0.5)

    zones = cells.dissolve(by="status", as_index=False)[["status", "geometry"]].explode(index_parts=False)
    zones = zones.reset_index(drop=True)
    zones["zone_idx"] = zones.index
    points = cells.copy()
    points["geometry"] = cells.representative_point()
    joined = gpd.sjoin(points, zones[["zone_idx", "status", "geometry"]], predicate="within", how="inner")
    joined = joined[joined["status_left"] == joined["status_right"]]

    rows = []
    for idx, grp in joined.groupby("zone_idx"):
        area = grp["area_hectares"].to_numpy(dtype=float)
        irr = grp["irrigated_area_ha"].fillna(0).to_numpy(dtype=float)
        total = float(area.sum())
        crop = grp.groupby("crop")["area_hectares"].sum().idxmax()
        row = {k: grp.iloc[0][k + "_left" if k == "status" else k] for k in KEEP}
        row.update({
            "crop": crop,
            "area_hectares": round(total, 1),
            "irrigated_area_ha": round(float(irr.sum()), 1),
            "irrigated_area_pct": round(float(irr.sum()) / total * 100, 1) if total else None,
            "zone_type": "commercial_farm" if total >= COMMERCIAL_HA else "smallholder",
            "geometry": largest(smooth(zones.loc[idx, "geometry"].buffer(-0.5))),
        })
        for k in WEIGHTED:
            row[k] = weighted(grp[k].to_numpy(dtype=float), area, 2 if k in ("soil_moisture_m3m3", "ndvi") else 1)
        rows.append(row)

    out = gpd.GeoDataFrame(rows, crs=UTM).sort_values("area_hectares", ascending=False).reset_index(drop=True)
    out["parcel_id"] = [f"ZONA_{BASIN_ID.upper()}_{i + 1:04d}" for i in range(len(out))]
    out["name"] = [f"Zona agrícola {i + 1:03d}" for i in range(len(out))]
    out = out.to_crs("EPSG:4326")
    cols = ["parcel_id", "name", "basin_id", "zone_type", "crop", "area_hectares", "irrigated_area_pct",
            "irrigated_area_ha", "baseline_water_pct", "sar_backscatter_db", "sar_delta_db", "soil_moisture_m3m3",
            "ndvi", "status", "status_label", "observation_date", "baseline_date", "sensor", "geometry"]
    out["geometry"] = out.geometry.set_precision(1e-6).apply(largest)
    feats = json.loads(out[cols].to_json(drop_id=True))["features"]

    raw["features"] = others + feats
    args.file.write_text(json.dumps(raw, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{BASIN_ID}: {len(mine)} celdas -> {len(feats)} zonas {out['status'].value_counts().to_dict()} "
          f"({args.file.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
