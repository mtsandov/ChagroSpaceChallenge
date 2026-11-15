# NASA GEOS-FP · Pronóstico 72 h

**Qué es:** pronóstico del modelo atmosférico operativo de NASA (GMAO GEOS Forward Processing).
**Punto:** la celda más cercana a lat `-1.865`, lon `-79.985` (centro en -2.0, -80.0) · **Resolución:** 0.25° × 0.3125°
**Corrida:** la indica el campo `corrida` del JSON (por ejemplo `20261114_00` = 14 nov, 00 UTC).

## Archivos
- `pronostico_72h.csv` / `pronostico_72h.json`: una fila por hora durante 72 h.
- `pronostico_diario.csv` / `pronostico_diario.json`: resumen de los **próximos 3 días completos**, en hora local de Ecuador (UTC−5).

## Resumen diario (`pronostico_diario.json` → `daily`)
| Campo | Unidad | Cálculo |
|---|---|---|
| `date` | AAAA-MM-DD (local) | día de 00:00 a 23:59 en America/Guayaquil |
| `temperature_2m_max` | °C | máximo de las 24 medias horarias de `t2m` |
| `temperature_2m_min` | °C | mínimo de las 24 medias horarias de `t2m` |
| `precipitation_sum` | mm | suma de las 24 horas de `prectot` |
| `precipitation_probability_max` | — | **`null`**: GEOS-FP es un modelo determinista y no da probabilidad |
| `et0_fao_evapotranspiration` | mm/día | ET₀ Penman-Monteith FAO-56, con la misma fórmula que `src/lib/agro/penmanMonteith.ts`. Entradas: Tmax/Tmin de `t2m`, Rs de `swgdn`, u₂ de `u2m`/`v2m`, eₐ de `qv2m` y `ps`, P de `ps` |

Este resumen diario se copia en `public/data/weather_daily.json` → `daule.forecast.daily` mediante `scripts/build_weather_daily.py`.

La máxima y la mínima salen de promedios horarios, así que pueden quedar ~0.5–1 °C por debajo o por encima del extremo instantáneo.

## Columnas
| Columna | Unidad | Variable GEOS-FP |
|---|---|---|
| `hora_utc` | ISO, UTC (Ecuador = UTC−5) | promedio horario centrado en :30 |
| `lluvia_mm_h` | mm/h | `prectot` × 3600 |
| `evaporacion_mm_h` | mm/h | `evap` × 3600 |
| `radiacion_w_m2` | W/m² | `swgdn` |
| `temp_c` | °C a 2 m | `t2m` − 273.15 |

## Uso
```js
const { corrida, horas } = await fetch('/data/geosfp/pronostico_72h.json').then(r => r.json());
const lluvia72h = horas.reduce((s, h) => s + h.lluvia_mm_h, 0);
```

El pronóstico vence pronto. Para tener el más reciente, corre otra vez `scripts/fetch_geosfp.py` (no requiere login).
Fuente: https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/fcast
