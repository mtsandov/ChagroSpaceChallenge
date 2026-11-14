# NISAR L2 GCOV · Contenido de cada archivo

Todos los archivos tienen la misma configuración:
- Track 112, frame 089, órbita descendente
- Proyección UTM 17S (`EPSG:32717`) y píxel de 10 m
- Valores `float32`; sin dato = `NaN`
- Retrodispersión RTC **gamma0**

| Archivo | Escena | Fecha | Polarización | Valores |
|---|---|---|---|---|
| `base_20260715_HHHH_db.tif` | **Base (seca)** | 2026-07-15 | **HH** | **dB** |
| `base_20260715_HVHV_db.tif` | **Base (seca)** | 2026-07-15 | **HV** | **dB** |
| `actual_20260901_HHHH_db.tif` | **Actual** | 2026-09-01 | **HH** | **dB** |
| `actual_20260901_HVHV_db.tif` | **Actual** | 2026-09-01 | **HV** | **dB** |
| `delta_HHHH_db.tif` | Cambio | actual − base | **HH** | **diferencia en dB** (ΔdB) |
| `delta_HVHV_db.tif` | Cambio | actual − base | **HV** | **diferencia en dB** (ΔdB) |

- En el producto original (HDF5), `HHHH` y `HVHV` vienen en **potencia lineal**. Aquí ya están convertidos con `dB = 10·log10(lineal)`.
- Para volver a lineal: `lineal = 10 ** (dB / 10)`. Promedia siempre en lineal, nunca en dB.
- El delta se calculó píxel a píxel a 10 m, sin filtrar. Para la máscara de agua conviene promediar antes (ver `../README.md`, sección Uso).

## Umbrales sugeridos para la máscara de agua
| Criterio | Umbral |
|---|---|
| Agua libre o lámina de riego (escena individual, HH) | `< -18 dB` |
| Agua nueva respecto de la base (ΔHH) | `< -3 dB` (con mucho ruido) · `< -6 dB` (conservador) |
| Separar agua de vegetación | HV bajo (`< -25 dB`) junto con HH bajo = agua; HV alto = cultivo |

## Por qué estas fechas (lluvia según NASA POWER)
| Periodo | Lluvia |
|---|---|
| 15 de julio → 1 de septiembre (entre base y actual) | **~4 mm en 48 días** |
| Julio y agosto 2026 | ~5 mm/mes (época seca) |
| 23 de septiembre → octubre | comienzan las lluvias; octubre suma **574 mm** |

Las dos escenas caen en plena época seca. Cualquier aumento de agua o humedad dentro de una parcela agrícola entre el 15 de julio y el 1 de septiembre **no se explica por la lluvia**: es riego o inundación de cultivo (por ejemplo arroz).

No se usaron escenas posteriores al 20 de septiembre por eso: después de esa fecha la lluvia domina la señal. Escenas disponibles de este track y frame en la época seca: 21 jun, 3 jul, 15 jul, 20 ago, 1 sep y 13 sep. Faltan las del 27 de julio y el 8 de agosto. La del 13 de septiembre no se usó porque llovieron ~11 mm el 10 y 11 de septiembre.
