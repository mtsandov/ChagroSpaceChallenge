# Pipeline de datos NASA

Scripts de Python que descargan datos NASA, los recortan a cada cuenca y generan los archivos de `public/data/`.
El formato que espera la app está en [Formato de salida](#formato-de-salida-contrato-con-la-app).

## Cuencas

Definidas en `scripts/config.py` → `BASINS`. Los datos de cada una van en `data/<basin_id>/`.

| `basin_id` | Punto (lat, lon) | Bbox (lon/lat, ~22 × 22 km) | NISAR | VIIRS |
|---|---|---|---|---|
| `daule` | -1.865, -79.985 | -80.085, -1.965, -79.885, -1.765 | track 112, frame 089 | h09v09 + h10v09 |
| `santa-elena` | -2.235, -80.585 | -80.685, -2.335, -80.485, -2.135 | track 112, frame 090 | h09v09 |

- **Periodo:** 2026-07-01 → 2026-11-14.
- **Par NISAR de época seca:** 2026-07-15 (base) vs 2026-09-01 (actual). Entre ambas escenas cayeron 9 mm de lluvia en Daule y 3.4 mm en Santa Elena en 48 días, según POWER.

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
../.venv/bin/python dissolve_parcels.py
../.venv/bin/python build_showcase.py
python3 fetch_power_history.py
../.venv/bin/python build_timeline.py
../.venv/bin/python build_hv_images.py
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
| `dissolve_parcels.py` | `sar_irrigation_anomalies.geojson` | Une las celdas vecinas con el mismo estado en zonas | — |
| `build_showcase.py` | Zonas + máscaras de agua | Deja en `public/data` solo las zonas destacadas cerca del centro de la cuenca (3 en exceso, 2 normales, 2 en déficit), con contorno redondeado, y recorta el agua a esas zonas | — |
| `fetch_power_history.py` | NASA POWER diario + climatología 2001–2025 | `power/lluvia_historica.json`: lluvia diaria desde el mes de la primera fecha de la línea de tiempo y promedio mensual histórico | No |
| `build_hv_images.py` | NISAR GCOV HV de cada fecha | `public/data/hv/<basin>_<fecha>.png` (HV a 50 m en EPSG:4326, de café = poca vegetación a verde oscuro = mucha, −24 a −12 dB) e índice `hv_images.json` | — |
| `build_timeline.py` | `nisar/gcov/timeline/` + NDVI + SME2 + SMAP + lluvia | Para cada fecha de `nisar_timeline` (en `config.py`): agua recortada a las zonas destacadas, serie por zona (agua, NDVI, HV, humedad, estado) y condiciones de la pasada | — |

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
| `nisar/gcov/timeline/<fecha>_{HHHH,HVHV}_db.tif` | Una pasada por mes para la línea de tiempo (solo Daule: 21 jun, 15 jul, 20 ago, 1 sep, 19 oct) | **dB**; EPSG:32717, 10 m |
| `nisar/sme2/soil_moisture_<fecha>.tif` | Humedad de suelo NISAR | m³/m³, ~200 m |
| `nisar/manifest.json` | Gránulos usados y humedad media por fecha | — |
| `parcelas/mapbiomas_agro.geojson` | Unidades agrícolas (clases 21 y 74) cortadas con una grilla de 500 m | EPSG:4326 |

### Cómo leer el radar
- **HH** responde al agua: el agua libre o la lámina de riego se ve muy oscura (< −18 dB). **HV** responde a la vegetación.
- A 10 m hay mucho *speckle*: **promedia a 50 m en escala lineal** antes de aplicar umbrales (`lineal = 10 ** (dB / 10)`).
- ΔHH < −3 dB indica que apareció agua o se cosechó; ΔHH > +3 dB indica suelo más húmedo o cultivo que crece.

## `build_sar_layers.py`

1. Promedia NISAR GCOV HH a 50 m y marca como agua lo que está bajo −18 dB en cada escena. Descarta manchas de menos de 1 ha y vectoriza.
2. Con `--parcels`, calcula por parcela: % con agua (base y actual), retrodispersión, ΔdB, humedad SME2 y NDVI.
3. Clasifica cada parcela: `excessive` si el agua **aumentó ≥ 10 puntos %** respecto a la escena base (riego nuevo en época seca, sin castigar el agua permanente), `deficit` si tiene < 5 % con agua y además suelo o NDVI secos, o `normal`.
4. Reemplaza en `public/data` solo las features de la cuenca actual.

Con `--masks-only` genera solo las máscaras de agua. Los umbrales están al inicio del script. Si las parcelas tienen la columna `cbn1` (capa MAATE), se filtran a *TIERRA AGROPECUARIA*.

Las parcelas usan IDs genéricos (`AGRO_DAULE_0001`): **no publiques nombres reales de fincas ni de propietarios**.

## Línea de tiempo (`build_timeline.py`)

- El estado de cada fecha se calcula contra la pasada de referencia (`NISAR_DATES["base"]`, 15 jul) con las mismas reglas de `build_sar_layers.py`. En la fecha de análisis (1 sep) se usan los valores oficiales de las zonas.
- Una pasada es **no concluyente** (`reliable: false`, estado `inconclusive`) si llovió más de 20 mm en los 7 días previos o SMAP marca más de 0.40 m³/m³: con lluvia fuerte y cultivo tupido, el agua bajo las plantas se ve brillante en HH (doble rebote) y el umbral de −18 dB no la detecta. La humedad SME2 de NISAR no se usa para esta regla porque en octubre tampoco reflejó la lluvia.
- En Daule, el 19 oct queda no concluyente: 95 mm en 7 días, SMAP 0.45 y 574 mm en octubre frente a ~6 mm de promedio (2001–2025).

## Resultados del par seco (50 m)

| Cuenca | Agua superficial | Parcelas | Agua en parcelas |
|---|---|---|---|
| Daule | 851 → 966 ha (+14 %) | 2 015 (46 400 ha) | 643 ha |
| Santa Elena | 101 → 131 ha (+29 %) | 508 (8 614 ha) | 19 ha |

## Formato de salida (contrato con la app)

La app lee `public/data/` y **no cambia** si se respetan los nombres de archivo y de campo.
- Los tipos de referencia están en `src/types/index.ts`.
- Cada script reemplaza solo las features o llaves de su cuenca (`basin_id`) y conserva las demás.
- La app solo lee estos archivos en `src/lib/api/useViewerData.ts`.

| Archivo | Lo genera | Campos |
|---|---|---|
| `weather_daily.json` | `build_weather_daily.py` | Objeto con una llave por `basin_id` → `source`, `community`, `location {lat, lng, elevation_m}`, `daily[]` y `forecast {source, daily[]}` |
| ↳ `daily[]` | POWER | `date`, `T2M_MAX`, `T2M_MIN` (°C), `T2MDEW` (°C, para eₐ), `RH2M` (%), `WS2M` (m/s a 2 m), `ALLSKY_SFC_SW_DWN` (MJ/m²/día), `PS` (**kPa**), `PRECTOTCORR` (mm/día). `-999` = faltante. La ET₀ **no** se guarda: la calcula `src/lib/agro/penmanMonteith.ts` |
| ↳ `forecast.daily[]` | GEOS-FP | `date`, `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, `precipitation_probability_max` (hoy `null`), `et0_fao_evapotranspiration` |
| `sar_irrigation_anomalies.geojson` | `build_sar_layers.py --parcels` | `Polygon` en EPSG:4326 → `parcel_id`, `name`, `basin_id`, `zone_type` (`commercial_farm` \| `smallholder` \| `community`), `crop`, `area_hectares`, `irrigated_area_pct`, `irrigated_area_ha`, `baseline_water_pct`, `sar_backscatter_db`, `sar_delta_db` (dB), `soil_moisture_m3m3`, `ndvi` (0–1), `status` (`excessive` \| `normal` \| `deficit`), `status_label`, `observation_date`, `baseline_date`, `sensor` |
| `sar_water_timeline.geojson` | `build_timeline.py` | `Polygon` → `basin_id`, `date`: agua de cada pasada dentro de las zonas destacadas (el slider del mapa) |
| `hv_images.json` + `hv/*.png` | `build_hv_images.py` | Una llave por `basin_id` → `{fecha: {url, bounds [[sur, oeste], [norte, este]]}}`: imagen de vegetación del modo Vigor |
| `sar_timeline.json` | `build_timeline.py` | Una llave por `basin_id` → `dates[]`, `reference_date`, `climatology_period`, `conditions {fecha: {rain_7d_mm, rain_12d_mm, smap_m3m3, reliable, month_rain_mm, month_climatology_mm}}` y `zones {parcel_id: [{date, water_pct, ndvi, hv_db, soil_moisture_m3m3, status}]}` (popup por fecha) |
| `basins.json` | A mano | `id`, `name`, `short_name`, `description`, `center [lat, lng]`, `zoom`, `sustainable_quota_ha` (cuota para el KPI "+X % sobre la cuota") |
| `virtual_stations.json` | A mano (hoy vacío) | `station_id`, `name`, `basin_id`, `lat`, `lng`, `canal_level_pct`, `flow_trend` (`increasing` \| `stable` \| `decreasing`), `alert_level` (`normal` \| `warning` \| `critical_low`), `last_updated`, `history [{date, level_pct}]` |
| `farmer_demo.json` | A mano (simulado) | Parcelas del agricultor demo. Las que crea el usuario se guardan en su navegador (localStorage) |
| `fallback_copilot.json` | A mano | Respuestas sin conexión por chip, con `{{variables}}` definidas en `api/_lib/copilot.ts` (`templateValues`) |

## Atribución
> Datos: NASA POWER (LaRC), NASA GMAO GEOS-FP, NASA VIIRS VNP13A1 (LP DAAC), NASA SMAP (NSIDC DAAC), NASA-ISRO NISAR (ASF DAAC). Parcelas: MapBiomas Ecuador, colección 4.
