import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DATA = ROOT.parent / "public" / "data"

BASINS = {
    "daule": {
        "point": (-1.865, -79.985),
        "bbox": (-80.085, -1.965, -79.885, -1.765),
        "elevation_m": 12,
        "nisar_track_frame": "_112_D_089_",
        "nisar_timeline": ["20260621", "20260715", "20260820", "20260901", "20261019"],
    },
    "santa-elena": {
        "point": (-2.235, -80.585),
        "bbox": (-80.685, -2.335, -80.485, -2.135),
        "elevation_m": 60,
        "nisar_track_frame": "_112_D_090_",
    },
}

BASIN_ID = os.environ.get("BASIN", "daule")
_b = BASINS[BASIN_ID]
POINT = _b["point"]
BBOX = _b["bbox"]
ELEVATION_M = _b["elevation_m"]
NISAR_TRACK_FRAME = _b["nisar_track_frame"]
NISAR_TIMELINE = _b.get("nisar_timeline", [])
DATA = ROOT / "data" / BASIN_ID

START = "2026-07-01"
END = "2026-11-14"

NISAR_DATES = {"base": "20260715", "actual": "20260901"}

for _sub in ("power", "geosfp", "ndvi", "smap", "nisar/gcov", "nisar/gcov/timeline", "nisar/sme2"):
    (DATA / _sub).mkdir(parents=True, exist_ok=True)
