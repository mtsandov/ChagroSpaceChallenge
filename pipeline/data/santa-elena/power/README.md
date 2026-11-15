# NASA POWER · Clima diario histórico

**Qué es:** datos meteorológicos diarios para un punto, calculados por NASA a partir de satélites y modelos (MERRA-2, CERES, IMERG). Incluye todas las variables que necesita la app para calcular la **ET₀ con Penman-Monteith**.
**Punto:** lat `-2.235`, lon `-80.585` (cuenca `santa-elena`) · **Celda:** ~0.5° (~55 km) · **Periodo:** 2026-07-01 → 2026-11-14 · **Comunidad:** `AG`

## Archivos
- `power_diario.json`: lista de objetos, uno por día, con los **nombres originales de POWER**. La app lo lee directamente.
- `power_diario.csv`: el mismo contenido en CSV.
- `power_raw.json`: respuesta original de la API, con los metadatos y las unidades.

## Campos
| Campo | Unidad | Descripción |
|---|---|---|
| `date` | AAAA-MM-DD | día |
| `T2M_MAX` | °C | temperatura máxima a 2 m |
| `T2M_MIN` | °C | temperatura mínima a 2 m |
| `T2MDEW` | °C | punto de rocío a 2 m (para calcular la presión de vapor eₐ) |
| `RH2M` | % | humedad relativa a 2 m |
| `WS2M` | m/s | velocidad del viento a 2 m |
| `ALLSKY_SFC_SW_DWN` | **MJ/m²/día** | radiación solar de onda corta en superficie (Rs) |
| `PS` | kPa | presión atmosférica en superficie |
| `PRECTOTCORR` | mm/día | precipitación corregida |
| `EVPTRNS` | MJ/m²/día | evapotranspiración del modelo, **solo como referencia** (no es la ET₀) |

**`-999` = dato aún no publicado.** Se deja tal cual. La radiación suele tardar entre 3 y 7 días en aparecer.

## Uso
```js
const dias = await fetch('/data/power/power_diario.json').then(r => r.json());
const ok = v => v !== -999;
const lluvia15d = dias.slice(-15).filter(d => ok(d.PRECTOTCORR)).reduce((s, d) => s + d.PRECTOTCORR, 0);
```

**Ojo:** la celda mide ~55 km, así que registra lloviznas (garúa) de la región. Para el KPI de "sin lluvia" usa un umbral, por ejemplo `< 1 mm` acumulado.

**API:** https://power.larc.nasa.gov/docs/services/api/
