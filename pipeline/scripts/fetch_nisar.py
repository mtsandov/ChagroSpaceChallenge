import json
import re
import time

import earthaccess
import h5py
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import transform_bounds

from config import BBOX, DATA, END, NISAR_DATES, NISAR_TIMELINE, NISAR_TRACK_FRAME, START

GCOV = ("NISAR_L2_GCOV_V1", "NISAR_L2_GCOV_PROVISIONAL_V1")
SME2 = ("NISAR_L3_SME2_V1", "NISAR_L3_SME2_PROVISIONAL_V1")


def search(collections, pattern, temporal=None):
    seen = {}
    for sn in collections:
        kw = {"short_name": sn, "granule_name": pattern}
        if temporal:
            kw["temporal"] = temporal
        try:
            res = earthaccess.search_data(**kw)
        except Exception:
            res = []
        for g in res:
            seen.setdefault(re.search(r"_(\d{8})T", g["umm"]["GranuleUR"]).group(1), g)
    return seen


def crop(grid, var, epsg):
    x, y = grid["xCoordinates"][:], grid["yCoordinates"][:]
    xmin, ymin, xmax, ymax = transform_bounds("EPSG:4326", f"EPSG:{epsg}", *BBOX)
    c0, c1 = np.searchsorted(x, [xmin, xmax])
    r0, r1 = np.searchsorted(-y, [-ymax, -ymin])
    data = grid[var][r0:r1, c0:c1].astype("float32")
    dx, dy = x[1] - x[0], y[0] - y[1]
    tf = from_origin(x[c0] - dx / 2, y[r0] + dy / 2, dx, dy)
    return data, tf


def save(path, arr, tf, epsg):
    with rasterio.open(path, "w", driver="GTiff", height=arr.shape[0], width=arr.shape[1], count=1,
                       dtype="float32", crs=f"EPSG:{epsg}", transform=tf, nodata=np.nan,
                       compress="deflate") as d:
        d.write(arr, 1)


def read_pol(g, pol, label):
    for attempt in range(4):
        try:
            f = h5py.File(earthaccess.open([g])[0], "r")
            grid = f["science/LSAR/GCOV/grids/frequencyA"]
            epsg = int(grid["projection"].attrs["epsg_code"])
            lin, tf = crop(grid, pol, epsg)
            return lin, tf, epsg
        except Exception as e:
            print(f"reintento {attempt + 1} {label} {pol}: {e.__class__.__name__}")
            time.sleep(30)
    raise SystemExit(f"No se pudo leer {label} {pol}")


earthaccess.login(strategy="netrc")
mpath = DATA / "nisar" / "manifest.json"
old = json.loads(mpath.read_text()) if mpath.exists() else {}
manifest = {"bbox": BBOX, "gcov": {}, "sme2": old.get("sme2", {})}

out = DATA / "nisar" / "gcov"
gcov = search(GCOV, f"*GCOV*{NISAR_TRACK_FRAME}*")
db = {}
for role, date in NISAR_DATES.items():
    g = gcov[date]
    for pol in ("HHHH", "HVHV"):
        path = out / f"{role}_{date}_{pol}_db.tif"
        if path.exists():
            with rasterio.open(path) as src:
                db[(role, pol)] = (src.read(1), src.transform, src.crs.to_epsg())
            continue
        lin, tf, epsg = read_pol(g, pol, role)
        arr = 10 * np.log10(np.where(lin > 0, lin, np.nan))
        save(path, arr, tf, epsg)
        db[(role, pol)] = (arr, tf, epsg)
    manifest["gcov"][role] = {"date": date, "granule": g["umm"]["GranuleUR"]}
    print(f"GCOV {role} {date} OK")

for pol in ("HHHH", "HVHV"):
    base, act = db[("base", pol)], db[("actual", pol)]
    h = min(base[0].shape[0], act[0].shape[0])
    w = min(base[0].shape[1], act[0].shape[1])
    save(out / f"delta_{pol}_db.tif", act[0][:h, :w] - base[0][:h, :w], act[1], act[2])
print("GCOV delta OK")

manifest["timeline"] = {}
tl = out / "timeline"
for date in NISAR_TIMELINE:
    g = gcov[date]
    for pol in ("HHHH", "HVHV"):
        path = tl / f"{date}_{pol}_db.tif"
        if path.exists():
            continue
        known = [p for p in out.glob(f"*_{date}_{pol}_db.tif")]
        if known:
            path.write_bytes(known[0].read_bytes())
            continue
        lin, tf, epsg = read_pol(g, pol, date)
        save(path, 10 * np.log10(np.where(lin > 0, lin, np.nan)), tf, epsg)
    manifest["timeline"][date] = g["umm"]["GranuleUR"]
    print(f"GCOV timeline {date} OK")

out = DATA / "nisar" / "sme2"
iso = lambda d: f"{d[:4]}-{d[4:6]}-{d[6:]}"
first = min(START, iso(NISAR_DATES["base"]))
sme2 = search(SME2, f"*SME2*{NISAR_TRACK_FRAME}*", (first, END))
for date, g in sorted(sme2.items()):
    if (out / f"soil_moisture_{date}.tif").exists():
        continue
    f = h5py.File(earthaccess.open([g])[0], "r")
    grid = f["science/LSAR/SME2/grids"]
    epsg = int(grid["projection"].attrs["epsg_code"])
    sm, tf = crop(grid, "soilMoisture", epsg)
    sm[sm < 0] = np.nan
    save(out / f"soil_moisture_{date}.tif", sm, tf, epsg)
    manifest["sme2"][date] = {"granule": g["umm"]["GranuleUR"], "mean_m3m3": float(np.nanmean(sm))}
    print(f"SME2 {date} OK, media {np.nanmean(sm):.3f} m3/m3")

mpath.write_text(json.dumps(manifest, indent=1))
