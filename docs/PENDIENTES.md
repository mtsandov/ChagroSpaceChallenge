# Decisiones pendientes

Lista viva: se actualiza a medida que se decide algo. Al resolver una, muévela a **Resueltas** con la fecha y lo que se eligió.

## Abiertas

| # | Tema | Opciones | Recomendación | Afecta |
|---|---|---|---|---|
| 1 | `forecast.daily[].precipitation_probability_max` llega en `null`, porque GEOS-FP es determinista y no da probabilidad | **A.** Tipo `number \| null` y mostrar "—" · **B.** Estimarla a partir de la lluvia (dato inventado) · **C.** Sacarla de Open-Meteo (deja de ser 100 % NASA) | **A** | `src/types/index.ts`, UI del pronóstico, copiloto |
| 2 | Ninguna parcela queda en `excessive`: el umbral es ≥ 30 % de la parcela con agua y el máximo real es 24 % (`AGRO_DAULE_0131`: 0 → 24 % con ~4 mm de lluvia) | **A.** Bajar `EXCESSIVE_PCT` a ~15 % · **B.** Usar el aumento respecto a la base (por ejemplo +10 puntos) · **C.** Dejarlo así | **B**: mide el riego nuevo en época seca y no castiga a las parcelas con agua permanente | `pipeline/scripts/build_sar_layers.py`, KPI y colores del mapa |
| 3 | Tamaño de las "unidades agrícolas": los parches de MapBiomas se cortan con una grilla de 1 km (máximo 100 ha por unidad) | 500 m · **1 km** · sin grilla (parches enteros, algunos de miles de ha) | 1 km | `build_parcels_mapbiomas.py --grid` |
| 4 | Ramas ya mergeadas en GitHub (`feat/nasa-pipeline-daule`, `feat/pipeline-santa-elena`) | Borrarlas · dejarlas | Borrarlas | Repo |
| 5 | Rasters fuera de git: `pipeline/chagro_tifs.zip` no incluye los rasters de MapBiomas (`data/*/parcelas/*.tif`) | Regenerar el ZIP · compartirlos aparte | Regenerar el ZIP antes de compartirlo | Equipo |

## Notas para el pitch
- MapBiomas da **parches de cobertura agrícola**, no fincas catastrales. En la demo se llaman "unidades agrícolas", no "fincas".
- Cifras NISAR del par seco (15 jul → 1 sep 2026):
  - **Daule:** agua superficial de 851 a 966 ha (+14 %) con ~4 mm de lluvia.
  - **Santa Elena:** de 101 a 131 ha (+29 %) con 3.4 mm.

## Resueltas

| Fecha | Tema | Decisión |
|---|---|---|
| 2026-11-14 | Cuenca piloto principal | Daule (centro de `basins.json`), no Durán–Samborondón |
| 2026-11-14 | Zona de Santa Elena | Centro de `santa-elena` en `basins.json` (-2.235, -80.585), no la ciudad de Salinas |
| 2026-11-14 | Par de escenas NISAR | Época seca: 2026-07-15 vs 2026-09-01, en ambas cuencas |
| 2026-11-14 | Fuente de parcelas | MapBiomas Ecuador col. 4 (2025), clases 21 y 74, mientras no llegue la capa MAATE |
