# Pipeline de datos NASA

Scripts de Python que descargan y procesan los datos NASA (NISAR GCOV/SME2, SMAP, VIIRS, POWER, GEOS-FP)
y generan los archivos de `public/data/` que usa el visor.

- **Formato de salida:** [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md)
- **Zona, fechas y escenas:** `scripts/config.py`
- Los rasters (`*.tif`, `*.h5`, `*.nc`) **no se versionan**: cada quien los descarga o los copia a `pipeline/data/`.

## Entorno

```bash
python -m venv pipeline/.venv
```

```bash
pipeline/.venv/Scripts/python -m pip install -r pipeline/requirements.txt
```

En macOS o Linux: `pipeline/.venv/bin/python`.

## Pasos

| Script | Genera | Notas |
|---|---|---|
| `fetch_power.py` | `data/power/*` | Sin login |
| `fetch_geosfp.py` | `data/geosfp/*` | Sin login |
| `fetch_ndvi.py`, `fetch_smap.py`, `fetch_nisar.py` | `data/ndvi`, `data/smap`, `data/nisar` | Requieren `~/.netrc` de NASA Earthdata |
| `build_weather_daily.py` | `public/data/weather_daily.json` | POWER + pronóstico GEOS-FP |
| `build_sar_layers.py` | `public/data/sar_water_mask_*.geojson` y `sar_irrigation_anomalies.geojson` | Ver abajo |

Ejecutar desde `pipeline/scripts`.

## `build_sar_layers.py`: SAR → capas del mapa

```bash
cd pipeline/scripts
```

```bash
../.venv/Scripts/python build_sar_layers.py --parcels ../data/parcelas/maate_cobertura_2022.shp
```

Para generar solo las máscaras de agua (no necesita parcelas):

```bash
../.venv/Scripts/python build_sar_layers.py --masks-only
```

**Qué hace:**
1. Promedia NISAR GCOV HH a 50 m en escala lineal para reducir el speckle.
2. Marca como agua los píxeles con HH < −18 dB en la escena base y en la actual, descarta manchas de menos de 1 ha y vectoriza a GeoJSON.
3. Con `--parcels`:
   - Carga los polígonos (`.shp`, `.gpkg`, `.geojson` o `.zip`, en cualquier CRS), los recorta al bbox y descarta los de menos de 5 ha. Si existe la columna `cbn1` (capa MAATE), filtra a *TIERRA AGROPECUARIA*.
   - Calcula por parcela el % con agua (base y actual), la retrodispersión, el ΔdB, la humedad NISAR SME2 y el NDVI de VIIRS, cada uno reproyectado a la grilla de su raster.
   - Clasifica el estado: `excessive` si tiene ≥ 30 % de agua en época seca; `deficit` si tiene < 5 % de agua y además suelo seco o NDVI bajo; `normal` en los demás casos.
4. Reemplaza en `public/data` solo las features de la cuenca de `config.BASIN_ID` y conserva las demás.

Los umbrales se ajustan al inicio del script. La referencia está en `data/nisar/gcov/README.md`: 851 → 966 ha de agua en la zona completa.

**Parcelas:** usa la capa MAATE de cobertura 2022 recortada a Daule, en `data/parcelas/`.
Los nombres se generan como IDs genéricos (`AGRO_DAULE_0001`, "Unidad agrícola 001"): **no publiques nombres reales de fincas ni de propietarios**.
