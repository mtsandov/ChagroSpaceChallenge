from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PUBLIC_DATA = ROOT.parent / "public" / "data"

BASIN_ID = "daule"
POINT = (-1.865, -79.985)
BBOX = (-80.085, -1.965, -79.885, -1.765)
ELEVATION_M = 12

START = "2026-07-01"
END = "2026-11-14"

NISAR_TRACK_FRAME = "_112_D_089_"
NISAR_DATES = {"base": "20260715", "actual": "20260901"}
