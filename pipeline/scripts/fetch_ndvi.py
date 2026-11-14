import csv
import math
import re
from collections import defaultdict
from datetime import date, timedelta

import earthaccess
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import transform_bounds

from config import BBOX, DATA, END, START
from remote import open_h5

SINU = "+proj=sinu +R=6371007.181 +nadgrids=@null +wktext"
TILE = 1111950.5197665
N = 2400
PIX = TILE / N
X0, Y0 = -20015109.354, 10007554.677
FIELDS = "HDFEOS/GRIDS/VIIRS_Grid_16Day_VI_500m/Data Fields/"

out = DATA / "ndvi"
out.mkdir(parents=True, exist_ok=True)
xmin, ymin, xmax, ymax = transform_bounds("EPSG:4326", SINU, *BBOX)
gc0, gc1 = math.floor((xmin - X0) / PIX), math.ceil((xmax - X0) / PIX)
gr0, gr1 = math.floor((Y0 - ymax) / PIX), math.ceil((Y0 - ymin) / PIX)
shape = (gr1 - gr0, gc1 - gc0)
transform = from_origin(X0 + gc0 * PIX, Y0 - gr0 * PIX, PIX, PIX)

by_date = defaultdict(list)
for g in earthaccess.search_data(short_name="VNP13A1", bounding_box=BBOX, temporal=(START, END)):
    m = re.search(r"A(\d{4})(\d{3})\.h(\d{2})v(\d{2})", g["umm"]["GranuleUR"])
    year, doy, h, v = map(int, m.groups())
    by_date[(date(year, 1, 1) + timedelta(days=doy - 1)).isoformat()].append((h, v, g))

rows = []
for d, tiles in sorted(by_date.items()):
    mosaic = {"ndvi": np.full(shape, np.nan, "float32"), "evi": np.full(shape, np.nan, "float32")}
    for h, v, g in tiles:
        r0, r1 = max(gr0, v * N), min(gr1, (v + 1) * N)
        c0, c1 = max(gc0, h * N), min(gc1, (h + 1) * N)
        if r1 <= r0 or c1 <= c0:
            continue
        f = open_h5(g)
        for label, field in (("ndvi", "500 m 16 days NDVI"), ("evi", "500 m 16 days EVI")):
            a = f[FIELDS + field][r0 - v * N:r1 - v * N, c0 - h * N:c1 - h * N].astype("float32")
            a[(a < -10000) | (a > 10000)] = np.nan
            mosaic[label][r0 - gr0:r1 - gr0, c0 - gc0:c1 - gc0] = a * 0.0001
    for label, a in mosaic.items():
        with rasterio.open(out / f"{label}_{d}.tif", "w", driver="GTiff", height=shape[0], width=shape[1],
                           count=1, dtype="float32", crs=SINU, transform=transform, nodata=np.nan) as dst:
            dst.write(a, 1)
    rows.append({
        "fecha_inicio": d,
        "ndvi_medio": round(float(np.nanmean(mosaic["ndvi"])), 4),
        "evi_medio": round(float(np.nanmean(mosaic["evi"])), 4),
        "tiles": " ".join(f"h{h:02d}v{v:02d}" for h, v, _ in sorted(tiles, key=lambda t: t[:2])),
    })
    print(f"NDVI {d}: {rows[-1]['ndvi_medio']} ({rows[-1]['tiles']})")

with open(out / "ndvi_serie.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)
