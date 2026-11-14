# ChAgro · Datos NASA

Todos los datos de esta carpeta vienen de NASA y cubren la cuenca piloto **Daule** (`basin_id: daule`, Cuenca Baja del Guayas, Ecuador).

- **Área (bbox lon/lat):** `-80.085, -1.965, -79.885, -1.765` (~22 × 22 km)
- **Punto de referencia:** lat `-1.865`, lon `-79.985` (centro de `basins.json`)
- **Periodo:** 2026-07-01 → 2026-11-14, más el pronóstico de 3 días desde el 2026-11-14

| Carpeta | Qué contiene | Fuente NASA | Resolución |
|---|---|---|---|
| `power/` | Lluvia, radiación, temperatura, humedad y ET diarias | NASA POWER | 0.5° (punto) |
| `geosfp/` | Pronóstico horario de 72 h | NASA GMAO GEOS-FP | 0.25° (punto) |
| `ndvi/` | Vigor de la vegetación (NDVI y EVI, 17 fechas) | VIIRS VNP13A1 (LP DAAC) | 500 m, cada 16 días |
| `smap/` | Humedad del suelo diaria (83 días con dato) | SMAP SPL3SMP_E (NSIDC) | 9 km |
| `nisar/gcov/` | Radar SAR: retrodispersión y cambio (ΔdB) | NISAR L2 GCOV (ASF) | 10 m |
| `nisar/sme2/` | Humedad del suelo derivada de NISAR (8 fechas, 3 jul → 19 oct) | NISAR L3 SME2 (ASF) | ~200 m |

Cada carpeta tiene su propio `README.md`.

## Cómo regenerar los datos
Los scripts están en `../scripts/`. Para cambiar la zona o las fechas, edita `scripts/config.py`.

Instalación, una sola vez (Python 3.9 o superior; también necesitas `~/.netrc` con tu usuario de Earthdata):
```bash
cd pipeline
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

```bash
cd scripts
python3 fetch_power.py                # sin login
python3 fetch_geosfp.py               # sin login
python3 build_weather_daily.py        # genera public/data/weather_daily.json
../.venv/bin/python fetch_ndvi.py     # requiere ~/.netrc de Earthdata
python3 fetch_smap.py                 # AppEEARS, solo stdlib
../.venv/bin/python fetch_nisar.py
```

## Atribución (obligatoria al mostrar los datos)
> Datos: NASA POWER (LaRC), NASA GMAO GEOS-FP, NASA VIIRS VNP13A1 (LP DAAC), NASA SMAP (NSIDC DAAC), NASA-ISRO NISAR (ASF DAAC).
