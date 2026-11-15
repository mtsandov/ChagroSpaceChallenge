from __future__ import annotations

import json

import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import unary_union

from config import BASIN_ID, PUBLIC_DATA

UTM = "EPSG:32717"
MAX_DIST_M = 7000
MIN_HA, MAX_HA = 40, 800
MIN_GAP_M = 1500
PICKS = {"excessive": 3, "normal": 2, "deficit": 2}
SMOOTH_M = 120
WATER_SMOOTH_M = 30
MIN_WATER_HA = 0.3


def read(name: str) -> dict:
    return json.loads((PUBLIC_DATA / name).read_text(encoding="utf-8"))


def write(name: str, data: dict, features: list) -> None:
    data["features"] = [f for f in data["features"] if f["properties"].get("basin_id") != BASIN_ID] + features
    (PUBLIC_DATA / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def smooth(geom, d: float):
    out = geom.buffer(2 * d, join_style="round").buffer(-2 * d, join_style="round")
    out = out.buffer(-d, join_style="round").buffer(d, join_style="round")
    if out.is_empty:
        return geom
    return max(out.geoms, key=lambda g: g.area) if out.geom_type == "MultiPolygon" else out


def to_features(gdf: gpd.GeoDataFrame) -> list:
    gdf = gdf.to_crs("EPSG:4326")
    gdf["geometry"] = gdf.geometry.set_precision(1e-6)
    return json.loads(gdf.to_json(drop_id=True))["features"]


def main() -> None:
    basin = next(b for b in read("basins.json") if b["id"] == BASIN_ID)
    center = gpd.GeoSeries([Point(basin["center"][1], basin["center"][0])], crs="EPSG:4326").to_crs(UTM).iloc[0]

    parcels_raw = read("sar_irrigation_anomalies.geojson")
    zones = gpd.GeoDataFrame.from_features(
        [f for f in parcels_raw["features"] if f["properties"]["basin_id"] == BASIN_ID], crs="EPSG:4326"
    ).to_crs(UTM)
    zones = zones[(zones["area_hectares"].between(MIN_HA, MAX_HA)) & (zones.distance(center) <= MAX_DIST_M)]

    chosen = []
    for status, n in PICKS.items():
        key = "irrigated_area_ha" if status == "excessive" else "area_hectares"
        for _, z in zones[zones["status"] == status].sort_values(key, ascending=False).iterrows():
            if sum(1 for c in chosen if c["status"] == status) >= n:
                break
            if all(z.geometry.centroid.distance(c.geometry.centroid) >= MIN_GAP_M for c in chosen):
                chosen.append(z)
    picked = gpd.GeoDataFrame(chosen, crs=UTM)
    picked["geometry"] = picked.geometry.apply(lambda g: g.convex_hull.buffer(-SMOOTH_M).buffer(SMOOTH_M))
    picked = picked.reset_index(drop=True)
    picked["name"] = [f"Zona agrícola {i + 1}" for i in range(len(picked))]

    area = unary_union(picked.geometry)
    for name in ("sar_water_mask_baseline.geojson", "sar_water_mask_current.geojson"):
        raw = read(name)
        water = gpd.GeoDataFrame.from_features(
            [f for f in raw["features"] if f["properties"]["basin_id"] == BASIN_ID], crs="EPSG:4326"
        ).to_crs(UTM)
        water["geometry"] = water.geometry.intersection(area).apply(lambda g: smooth(g, WATER_SMOOTH_M))
        water = water[~water.is_empty & (water.area / 10_000 >= MIN_WATER_HA)]
        write(name, raw, to_features(water[["basin_id", "scene", "water_class", "geometry"]]))
        print(f"  {name}: {len(water)} manchas de agua")

    write("sar_irrigation_anomalies.geojson", parcels_raw, to_features(picked))
    print(f"{BASIN_ID}: {len(picked)} zonas destacadas {picked['status'].value_counts().to_dict()}")


if __name__ == "__main__":
    main()
