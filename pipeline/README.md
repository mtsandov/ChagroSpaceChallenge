# Pipeline de datos NASA

Scripts de Python que descargan datos NASA, los recortan a cada cuenca y generan los archivos de `public/data/`.
Formato de salida: [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md).

## Cuencas

Definidas en `scripts/config.py` → `BASINS`. Los datos de cada una van en `data/<basin_id>/`.

| `basin_id` | Punto (lat, lon) | Bbox (lon/lat, ~22 × 22 km) | NISAR | VIIRS |
|---|---|---|---|---|
| `daule` | -1.865, -79.985 | -80.085, -1.965, -79.885, -1.765 | track 112, frame 089 | h09v09 + h10v09 |
| `santa-elena` | -2.235, -80.585 | -80.685, -2.335, -80.485, -2.135 | track 112, frame 090 | h09v09 |

- **Periodo:** 2026-07-01 → 2026-11-14.
- **Par NISAR de época seca:** 2026-07-15 (base) vs 2026-09-01 (actual). Entre ambas escenas cayeron ~4 mm de lluvia en Daule y 3.4 mm en Santa Elena, según POWER.

## Entorno

Requisitos: Python 3.9 o superior, y un `~/.netrc` con tu usuario de [NASA Earthdata](https://urs.earthdata.nasa.gov):
```
machine urs.earthdata.nasa.gov login TU_USUARIO password TU_CLAVE
```

```bash
cd pipeline
python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt
```
En Windows, usa `.venv/Scripts/python`.

## Correr

Desde `pipeline/scripts`, con la cuenca en la variable `BASIN` (por defecto `daule`):

```bash
export BASIN=santa-elena
python3 fetch_power.py
python3 fetch_geosfp.py
python3 build_weather_daily.py
../.venv/bin/python fetch_ndvi.py
python3 fetch_smap.py
../.venv/bin/python fetch_nisar.py
../.venv/bin/python build_parcels_mapbiomas.py ../data/$BASIN/parcelas/<raster_mapbiomas>.tif
../.venv/bin/python build_sar_layers.py --parcels ../data/$BASIN/parcelas/mapbiomas_agro.geojson
```

| Script | Fuente | Genera | Login |
|---|---|---|---|
| `fetch_power.py` | NASA POWER, diario | `power/` | No |
| `fetch_geosfp.py` | NASA GMAO GEOS-FP | `geosfp/` | No |
| `build_weather_daily.py` | POWER + GEOS-FP | `public/data/weather_daily.json` → `<basin>` | — |
| `fetch_ndvi.py` | VIIRS VNP13A1 | `ndvi/` | Sí |
| `fetch_smap.py` | SMAP SPL3SMP_E vía AppEEARS | `smap/` | Sí |
| `fetch_nisar.py` | NISAR L2 GCOV + L3 SME2 (ASF) | `nisar/` | Sí |
| `build_parcels_mapbiomas.py` | MapBiomas Ecuador col. 4 | `parcelas/mapbiomas_agro.geojson` | — |
| `build_sar_layers.py` | Todo lo anterior | `public/data/sar_*.geojson` → `<basin>` | — |

Los rasters (`*.tif`, `*.h5`, `*.nc`) **no se versionan**. Cada quien los genera con los scripts o los recibe en un ZIP que se descomprime dentro de `pipeline/`.

## Archivos de cada cuenca

| Archivo | Contenido | Unidades / proyección |
|---|---|---|
| `power/power_diario.json` | `date`, `T2M_MAX`, `T2M_MIN`, `T2MDEW`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`, `PS`, `PRECTOTCORR`, `EVPTRNS` | °C, %, m/s, **MJ/m²/día**, **kPa**, mm/día; `-999` = sin dato aún |
| `geosfp/pronostico_72h.*` | Pronóstico por hora: lluvia, evaporación, radiación, temperatura, viento, eₐ y presión | mm/h, W/m², °C, m/s, kPa; hora UTC |
| `geosfp/pronostico_diario.*` | 3 días completos en hora local: `temperature_2m_max/min`, `precipitation_sum`, `et0_fao_evapotranspiration` (FAO-56) | `precipitation_probability_max` = `null`, porque GEOS-FP es determinista |
| `ndvi/ndvi_*.tif`, `evi_*.tif`, `ndvi_serie.csv` | Compuestos de 16 días (la fecha es el inicio) | −1 a 1; proyección sinusoidal MODIS, 500 m |
| `smap/smap_humedad_diaria.csv` | Promedio de 5 puntos (centro y esquinas), pasadas AM y PM | m³/m³, celda de 9 km |
| `nisar/gcov/{base,actual}_<fecha>_{HHHH,HVHV}_db.tif` | Retrodispersión RTC gamma0 | **dB**; EPSG:32717, 10 m |
| `nisar/gcov/delta_{HHHH,HVHV}_db.tif` | Actual − base | ΔdB |
| `nisar/sme2/soil_moisture_<fecha>.tif` | Humedad de suelo NISAR | m³/m³, ~200 m |
| `nisar/manifest.json` | Gránulos usados y humedad media por fecha | — |
| `parcelas/mapbiomas_agro.geojson` | Unidades agrícolas (clases 21 y 74) cortadas con una grilla de 1 km | EPSG:4326 |

### Cómo leer el radar
- **HH** responde al agua: el agua libre o la lámina de riego se ve muy oscura (< −18 dB). **HV** responde a la vegetación.
- A 10 m hay mucho *speckle*: **promedia a 50 m en escala lineal** antes de aplicar umbrales (`lineal = 10 ** (dB / 10)`).
- ΔHH < −3 dB indica que apareció agua o se cosechó; ΔHH > +3 dB indica suelo más húmedo o cultivo que crece.

## `build_sar_layers.py`

1. Promedia NISAR GCOV HH a 50 m y marca como agua lo que está bajo −18 dB en cada escena. Descarta manchas de menos de 1 ha y vectoriza.
2. Con `--parcels`, calcula por parcela: % con agua (base y actual), retrodispersión, ΔdB, humedad SME2 y NDVI.
3. Clasifica cada parcela: `excessive` (≥ 30 % con agua), `deficit` (< 5 % con agua y además suelo o NDVI secos) o `normal`.
4. Reemplaza en `public/data` solo las features de la cuenca actual.

Con `--masks-only` genera solo las máscaras de agua. Los umbrales están al inicio del script. Si las parcelas tienen la columna `cbn1` (capa MAATE), se filtran a *TIERRA AGROPECUARIA*.

Las parcelas usan IDs genéricos (`AGRO_DAULE_0001`): **no publiques nombres reales de fincas ni de propietarios**.

## Resultados del par seco (50 m)

| Cuenca | Agua superficial | Parcelas | Agua en parcelas |
|---|---|---|---|
| Daule | 851 → 966 ha (+14 %) | 574 (46 532 ha) | 644 ha |
| Santa Elena | 101 → 131 ha (+29 %) | 226 (9 083 ha) | 20 ha |

## Atribución
> Datos: NASA POWER (LaRC), NASA GMAO GEOS-FP, NASA VIIRS VNP13A1 (LP DAAC), NASA SMAP (NSIDC DAAC), NASA-ISRO NISAR (ASF DAAC). Parcelas: MapBiomas Ecuador, colección 4.
