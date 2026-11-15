"""
Polígonos agrícolas a partir del raster de cobertura MapBiomas Ecuador (colección 4).

Recorta el GeoTIFF al bbox de la cuenca, se queda con las clases agrícolas
(21 = mosaico de agricultura y/o pastos, 74 = banano), elimina manchas pequeñas,
vectoriza y divide los parches grandes con una grilla para obtener unidades
de tamaño manejable. Salida: data/<basin>/parcelas/mapbiomas_agro.geojson (EPSG:4326),
lista para `build_sar_layers.py --parcels`.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio import features
from rasterio.windows import from_bounds
from shapely.geometry import box, shape

from config import BASIN_ID, BBOX, DATA

CLASSES = {21: "Mosaico de agricultura y/o pastos", 74: "Banano"}
MIN_PIXELS = 20
GRID_M = 500
MIN_HA = 5
SIMPLIFY_M = 15
UTM = "EPSG:32717"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("raster", type=Path, help="GeoTIFF de cobertura MapBiomas Ecuador")
    ap.add_argument("--grid", type=float, default=GRID_M, help="Lado de la grilla para dividir parches (m)")
    args = ap.parse_args()

    with rasterio.open(args.raster) as src:
        win = from_bounds(*BBOX, transform=src.transform).round_offsets().round_lengths()
        data = src.read(1, window=win)
        transform = src.window_transform(win)
        crs = src.crs
    if data.size == 0 or not np.isin(data, list(CLASSES)).any():
        raise SystemExit(f"El raster no cubre {BASIN_ID} o no tiene clases agrícolas dentro del bbox {BBOX}")

    agro = np.where(np.isin(data, list(CLASSES)), data, 0).astype("uint8")
    agro = features.sieve(agro, size=MIN_PIXELS, connectivity=8)
    shapes = features.shapes(agro, mask=agro > 0, transform=transform, connectivity=8)
    gdf = gpd.GeoDataFrame(
        [{"code": int(v), "geometry": shape(g)} for g, v in shapes], crs=crs
    ).to_crs(UTM)

    xmin, ymin, xmax, ymax = gdf.total_bounds
    xs = np.arange(xmin - xmin % args.grid, xmax + args.grid, args.grid)
    ys = np.arange(ymin - ymin % args.grid, ymax + args.grid, args.grid)
    grid = gpd.GeoDataFrame(geometry=[box(x, y, x + args.grid, y + args.grid) for x in xs for y in ys], crs=UTM)
    gdf = gpd.overlay(gdf, grid, how="intersection", keep_geom_type=True).explode(index_parts=False)

    gdf["area_ha"] = gdf.area / 10_000
    gdf = gdf[gdf["area_ha"] >= MIN_HA].copy()
    gdf["geometry"] = gdf.simplify(SIMPLIFY_M, preserve_topology=True)
    gdf = gdf.sort_values("area_ha", ascending=False).reset_index(drop=True)
    gdf["crop"] = gdf["code"].map(CLASSES)
    gdf["source"] = f"MapBiomas Ecuador col. 4 ({args.raster.stem})"
    gdf["area_ha"] = gdf["area_ha"].round(1)

    out = DATA / "parcelas" / "mapbiomas_agro.geojson"
    out.parent.mkdir(parents=True, exist_ok=True)
    gdf[["crop", "code", "area_ha", "source", "geometry"]].to_crs("EPSG:4326").to_file(out, driver="GeoJSON")
    print(f"{BASIN_ID}: {len(gdf)} unidades agrícolas, {gdf['area_ha'].sum():,.0f} ha, "
          f"{gdf['crop'].value_counts().to_dict()} -> {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
