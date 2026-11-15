# Contrato de datos (pipeline NASA → app)

La app lee estos archivos desde `public/data/`. El pipeline (`pipeline/`) genera los marcados como **NASA**;
los demás se editan a mano y deben mantener **los mismos nombres de archivo y campos**.

| Archivo | Origen |
|---|---|
| `weather_daily.json` | NASA (POWER + GEOS-FP) |
| `sar_irrigation_anomalies.geojson`, `sar_water_mask_*.geojson` | NASA (NISAR, VIIRS) + parcelas MapBiomas |
| `basins.json` | Configuración manual |
| `virtual_stations.json`, `farmer_demo.json` | Simulados |
| `fallback_copilot.json` | Plantillas manuales |
Los tipos TypeScript de referencia están en `src/types/index.ts`.

Cuando los datos pasen a Supabase, las tablas equivalentes ya existen en
`supabase/migrations/20261114000000_init.sql`. En ese caso solo hay que cambiar
`api/_lib/data.ts` y `src/lib/api/useViewerData.ts`.

## `basins.json` — cuencas piloto

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | `daule`, `santa-elena` |
| `name`, `short_name`, `description` | string | |
| `center` | `[lat, lng]` | Centro del mapa |
| `zoom` | number | Zoom inicial |
| `sustainable_quota_ha` | number | Cuota sostenible de área regada (para el KPI "+X% sobre la cuota") |

## `sar_irrigation_anomalies.geojson` — parcelas con métricas SAR

FeatureCollection de `Polygon` en EPSG:4326. Propiedades:

| Campo | Unidad | Fuente |
|---|---|---|
| `parcel_id`, `name`, `basin_id` | — | Catastro / capa MAATE |
| `zone_type` | `commercial_farm` \| `smallholder` \| `community` | |
| `crop` | texto | |
| `area_hectares` | ha | Geometría |
| `irrigated_area_pct`, `irrigated_area_ha` | %, ha | Máscara de agua NISAR GCOV (o OPERA DSWx-S1) |
| `baseline_water_pct` | % | Escena base seca |
| `sar_backscatter_db` | dB | Promedio σ⁰ de la parcela en el pase actual |
| `sar_delta_db` | dB | Actual − base |
| `soil_moisture_m3m3` | m³/m³ | NISAR SME2 / SMAP |
| `ndvi` | 0–1 | VIIRS VNP13A1 |
| `status` | `excessive` \| `normal` \| `deficit` | Clasificación por umbral |
| `status_label` | texto | Etiqueta en español |
| `observation_date`, `baseline_date` | `YYYY-MM-DD` | |
| `sensor` | texto | p. ej. `NISAR GCOV` |

## `sar_water_mask_baseline.geojson` / `sar_water_mask_current.geojson`

Polígonos de agua superficial de cada escena. Propiedades: `basin_id`, `scene` (`baseline` \| `current`)
y `water_class` (`irrigation`, `residual`, `river`).

> Si el pipeline genera rasters, se pueden servir como tiles XYZ (`gdal2tiles`) en `public/tiles/<escena>/{z}/{x}/{y}.png`
> y agregar `<TileLayer>` dentro de los panes `sar-baseline` y `sar-current` de `SarMap.tsx`. El comparador ya los recorta.

## `virtual_stations.json` — estaciones de canal o estero

`station_id`, `name`, `basin_id`, `lat`, `lng`, `canal_level_pct`, `flow_trend` (`increasing` \| `stable` \| `decreasing`),
`alert_level` (`normal` \| `warning` \| `critical_low`), `last_updated` (ISO), `history: [{date, level_pct}]`.

## `weather_daily.json` — clima diario NASA POWER + pronóstico

Objeto con una llave por `basin_id`:

```jsonc
{
  "daule": {
    "source": "NASA POWER daily point API",
    "community": "AG",
    "location": { "lat": -1.865, "lng": -79.985, "elevation_m": 12 },
    "daily": [
      {
        "date": "2026-11-14",
        "T2M_MAX": 31.5,           // °C
        "T2M_MIN": 22.3,           // °C
        "T2MDEW": 20.1,            // °C  → ea (FAO-56 ec. 14)
        "RH2M": 72,                // %   (respaldo si falta T2MDEW)
        "WS2M": 2.3,               // m/s (ya a 2 m)
        "ALLSKY_SFC_SW_DWN": 17.2, // MJ/m²/día (community=AG)
        "PS": 101.05,              // kPa (¡no hPa!)
        "PRECTOTCORR": 0           // mm/día
      }
    ],
    "forecast": {
      "source": "Open-Meteo / GEOS-FP",
      "daily": [{ "date": "2026-11-15", "temperature_2m_max": 31, "temperature_2m_min": 22,
                  "precipitation_sum": 0, "precipitation_probability_max": 5, "et0_fao_evapotranspiration": 4.2 }]
    }
  }
}
```

- Los valores `-999` de POWER se pueden dejar tal cual: el motor los trata como faltantes.
- Consulta de referencia:
  `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,T2MDEW,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PS,PRECTOTCORR&community=AG&latitude=-1.865&longitude=-79.985&start=20261015&end=20261114&format=JSON`
- La ET₀ **no** se guarda en el JSON: la calcula `src/lib/agro/penmanMonteith.ts`.

## `farmer_demo.json` — parcelas del agricultor demo

Solo para el modo demo. En producción estos datos viven en `parcels` e `irrigation_systems` (Supabase).

## `fallback_copilot.json` — respuestas sin conexión

Plantillas con `{{variables}}` por chip. Las variables disponibles se definen en `api/_lib/copilot.ts` (`templateValues`).
