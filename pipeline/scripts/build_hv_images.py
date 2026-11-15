from __future__ import annotations

import json
import os
import re

import numpy as np
import rasterio
from rasterio.warp import Resampling, calculate_default_transform, reproject

from build_sar_layers import GCOV, multilook_db
from config import BASIN_ID, PUBLIC_DATA

os.environ["GDAL_PAM_ENABLED"] = "NO"

LOOKS = 5
LEVELS = 32
HV_MIN, HV_MAX = -24.0, -12.0
ALPHA = 215
STOPS = [(0.0, "#7c4a1e"), (0.35, "#d6b45a"), (0.6, "#7cb342"), (0.8, "#2e7d32"), (1.0, "#0b3d17")]
OUT = PUBLIC_DATA / "hv"
INDEX = PUBLIC_DATA / "hv_images.json"


def colormap(t: np.ndarray) -> np.ndarray:
    xs = [s[0] for s in STOPS]
    rgb = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for _, c in STOPS], dtype="float64")
    return np.stack([np.interp(t, xs, rgb[:, k]) for k in range(3)], axis=-1)


def sources() -> dict[str, object]:
    found = {}
    for p in sorted((GCOV / "timeline").glob("*_HVHV_db.tif")) + sorted(GCOV.glob("*_HVHV_db.tif")):
        m = re.search(r"(\d{8})_HVHV", p.name)
        if m and m[1] not in found:
            found[m[1]] = p
    return found


def render(path, name: str) -> list[list[float]]:
    with rasterio.open(path) as src:
        ml = multilook_db(src.read(1).astype("float64"), LOOKS)
        tf = src.transform * src.transform.scale(LOOKS)
        h, w = ml.shape
        dst_tf, dw, dh = calculate_default_transform(src.crs, "EPSG:4326", w, h, *rasterio.transform.array_bounds(h, w, tf))
        out = np.full((dh, dw), np.nan)
        reproject(ml, out, src_transform=tf, src_crs=src.crs, dst_transform=dst_tf, dst_crs="EPSG:4326",
                  resampling=Resampling.bilinear, src_nodata=np.nan, dst_nodata=np.nan)
    t = np.round(np.clip((out - HV_MIN) / (HV_MAX - HV_MIN), 0, 1) * (LEVELS - 1)) / (LEVELS - 1)
    rgba = np.zeros((dh, dw, 4), dtype="uint8")
    rgba[..., :3] = colormap(np.nan_to_num(t)).astype("uint8")
    rgba[..., 3] = np.where(np.isfinite(out), ALPHA, 0)
    with rasterio.open(OUT / name, "w", driver="PNG", width=dw, height=dh, count=4, dtype="uint8", zlevel=9) as dst:
        dst.write(rgba.transpose(2, 0, 1))
    west, north = dst_tf.c, dst_tf.f
    east, south = west + dst_tf.a * dw, north + dst_tf.e * dh
    return [[round(south, 6), round(west, 6)], [round(north, 6), round(east, 6)]]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {}
    index[BASIN_ID] = {}
    for d, path in sources().items():
        name = f"{BASIN_ID}_{d}.png"
        bounds = render(path, name)
        iso = f"{d[:4]}-{d[4:6]}-{d[6:]}"
        index[BASIN_ID][iso] = {"url": f"data/hv/{name}", "bounds": bounds}
        print(f"  {iso}: {name} ({(OUT / name).stat().st_size / 1024:.0f} KB)")
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{BASIN_ID}: {len(index[BASIN_ID])} imágenes HV → {INDEX.name}")


if __name__ == "__main__":
    main()
