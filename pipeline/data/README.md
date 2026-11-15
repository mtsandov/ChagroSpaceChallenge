# ChAgro · Datos NASA

Todos los datos de esta carpeta vienen de NASA. Hay **una subcarpeta por cuenca piloto**, con el mismo `id` que usa `public/data/basins.json`:

| Cuenca (`basin_id`) | Zona | Punto (lat, lon) | Bbox (lon/lat) | NISAR |
|---|---|---|---|---|
| `daule/` | Cuenca Baja del Guayas – Daule | -1.865, -79.985 | `-80.085, -1.965, -79.885, -1.765` | track 112, frame 089 |
| `santa-elena/` | Canal Trasvase – Santa Elena | -2.235, -80.585 | `-80.685, -2.335, -80.485, -2.135` | track 112, frame 090 |

- Cada bbox mide ~22 × 22 km.
- **Periodo:** 2026-07-01 → 2026-11-14, más el pronóstico de 3 días desde el 2026-11-14.
- **Par NISAR seco:** 2026-07-15 (base) vs 2026-09-01 (actual) en ambas cuencas.

Dentro de cada cuenca:

| Carpeta | Qué contiene | Fuente NASA | Resolución |
|---|---|---|---|
| `power/` | Clima diario con las variables de Penman-Monteith | NASA POWER | 0.5° (punto) |
| `geosfp/` | Pronóstico horario de 72 h y resumen diario con ET₀ | NASA GMAO GEOS-FP | 0.25° (punto) |
| `ndvi/` | Vigor de la vegetación (NDVI y EVI) | VIIRS VNP13A1 (LP DAAC) | 500 m, cada 16 días |
| `smap/` | Humedad del suelo diaria | SMAP SPL3SMP_E (NSIDC) | 9 km |
| `nisar/gcov/` | Radar SAR: retrodispersión y cambio (ΔdB) | NISAR L2 GCOV (ASF) | 10 m |
| `nisar/sme2/` | Humedad del suelo derivada de NISAR | NISAR L3 SME2 (ASF) | ~200 m |

Cada carpeta tiene su propio `README.md`. Los `.tif` no se versionan en git: se comparten aparte en un ZIP que se descomprime dentro de `pipeline/`.

## Cómo regenerar los datos
Las cuencas y sus parámetros están en `scripts/config.py` (`BASINS`). Se elige la cuenca con la variable `BASIN`, que por defecto es `daule`.

Instalación, una sola vez (Python 3.9 o superior; también necesitas `~/.netrc` con tu usuario de Earthdata):
```bash
cd pipeline
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

```bash
cd scripts
export BASIN=santa-elena              # o daule
python3 fetch_power.py                # sin login
python3 fetch_geosfp.py               # sin login
python3 build_weather_daily.py        # actualiza public/data/weather_daily.json → <BASIN>
../.venv/bin/python fetch_ndvi.py     # requiere ~/.netrc de Earthdata
python3 fetch_smap.py                 # AppEEARS, solo stdlib
../.venv/bin/python fetch_nisar.py
```

Para agregar otra cuenca, añade una entrada en `BASINS` con su `point`, `bbox`, `elevation_m` y `nisar_track_frame`. Las escenas NISAR disponibles se buscan en https://search.asf.alaska.edu.

## Atribución (obligatoria al mostrar los datos)
> Datos: NASA POWER (LaRC), NASA GMAO GEOS-FP, NASA VIIRS VNP13A1 (LP DAAC), NASA SMAP (NSIDC DAAC), NASA-ISRO NISAR (ASF DAAC).
