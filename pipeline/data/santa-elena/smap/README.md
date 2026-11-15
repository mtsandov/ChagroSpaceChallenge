# NASA SMAP SPL3SMP_E · Humedad del suelo diaria

**Qué es:** humedad volumétrica de los primeros ~5 cm del suelo, medida por el radiómetro de banda L de SMAP.
**Resolución:** 9 km (malla EASE-Grid 2.0). La zona piloto ocupa apenas 3 × 3 celdas, así que cada valor es un **promedio regional**, no por finca.

## Archivos
- `smap_humedad_diaria.csv`: una fila por día, con el promedio de 5 puntos (centro y 4 esquinas de la bbox).
- `appeears_raw.csv`: la extracción original de AppEEARS, por punto, con todas las columnas.

Se genera con `scripts/fetch_smap.py`, que pide a **AppEEARS** solo los valores de esos puntos (unos KB) en lugar de descargar los archivos globales, que pesan unos 20 MB por día.

## Columnas
| Columna | Unidad | Descripción |
|---|---|---|
| `fecha` | AAAA-MM-DD | día de la pasada |
| `humedad_am_m3m3` | m³/m³ | pasada de las 6:00 hora local (la más fiable) |
| `humedad_pm_m3m3` | m³/m³ | pasada de las 18:00 hora local |

- Vacío = el satélite no pasó por la zona ese día o el dato fue descartado (agua, urbano, mucha vegetación).
- Guía: `< 0.15` seco · `0.15–0.30` húmedo · `> 0.35` saturado o inundado.

## Uso
```python
import pandas as pd
df = pd.read_csv("smap_humedad_diaria.csv", parse_dates=["fecha"])
df["humedad"] = df["humedad_am_m3m3"].fillna(df["humedad_pm_m3m3"])
```

Úsalo como contexto regional. Para el detalle por parcela usa `../nisar/sme2/`.
Producto: https://nsidc.org/data/spl3smp_e
