# NASA-ISRO NISAR · Radar SAR banda L

**Qué es:** imágenes de radar de apertura sintética (SAR) en banda L. El radar ve a través de las nubes y de noche, y responde al agua y a la humedad de la superficie.
**Escenas:** track 112, frame 089, órbita descendente (~18:40 hora de Ecuador). Ver `manifest.json`, que lista los gránulos exactos.

## `gcov/`: retrodispersión (backscatter)
Producto **L2 GCOV**: imagen geocodificada y corregida por terreno (RTC, gamma0).

| Archivo | Contenido |
|---|---|
| `base_20260715_HHHH_db.tif` | Escena base (15 jul, seca), polarización HH, en dB |
| `base_20260715_HVHV_db.tif` | Escena base, polarización HV, en dB |
| `actual_20260901_HHHH_db.tif` | Escena actual (1 sep, seca), HH, en dB |
| `actual_20260901_HVHV_db.tif` | Escena actual, HV, en dB |
| `delta_HHHH_db.tif` / `delta_HVHV_db.tif` | Cambio = actual − base (dB) |

- **Proyección:** UTM 17S (`EPSG:32717`) · **Píxel:** 10 m · Sin dato = `NaN`
- **HH** es sensible al agua superficial: el agua libre o la lámina de riego se ve **muy oscura** (< −18 dB).
- **HV** es sensible a la vegetación y su volumen. Sirve para separar cultivo de agua.

### Cómo leer el ΔdB
| ΔdB (HH) | Interpretación |
|---|---|
| < −3 dB | Apareció agua superficial (posible inundación o riego) |
| −3 a +3 | Sin cambio relevante |
| > +3 dB | Suelo más húmedo o rugoso, o crecimiento del cultivo |

### Uso
**Importante:** a 10 m el radar tiene mucho *speckle* (ruido granular). Si aplicas el umbral píxel a píxel, sobreestimas el área unas 4 veces. Promedia antes a 50 m, en escala lineal:

```python
import rasterio, numpy as np

def leer(p):
    with rasterio.open(p) as s:
        return s.read(1)

def multilook(db, k=5):
    lin = 10 ** (db / 10)
    h, w = (lin.shape[0] // k) * k, (lin.shape[1] // k) * k
    return 10 * np.log10(np.nanmean(lin[:h, :w].reshape(h // k, k, w // k, k), axis=(1, 3)))

base = multilook(leer("gcov/base_20260715_HHHH_db.tif"))
act = multilook(leer("gcov/actual_20260901_HHHH_db.tif"))
delta = act - base
agua_actual_ha = (act < -18).sum() * 0.25
agua_nueva_ha = (delta < -6).sum() * 0.25
```
Referencia de la zona completa a 50 m, con el par seco (15 de julio → 1 de septiembre, ~4 mm de lluvia en total):
- Superficie oscura (HH < −18 dB): **851 ha → 966 ha (+14 %)** sin lluvia. Incluye el río Daule, que no cambia.
- ΔHH < −6 dB: **~4 900 ha**. Puede ser cosecha (se retira el cultivo) o pozas de arroz recién inundadas sin planta. Para separarlas, crúzalo con el NDVI (si baja, es cosecha) y con HV.
- ΔHH > +6 dB (cultivo que crece o suelo más húmedo): **~2 000 ha**.
- SME2 se mantiene en 0.25–0.30 m³/m³ durante toda la época seca.
Para pasar las zonas a polígonos GeoJSON usa `rasterio.features.shapes(agua_nueva.astype("uint8"), transform=src.transform)` y reproyecta a EPSG:4326.

En QGIS: arrastra el `.tif` y aplica la simbología "Banda única pseudocolor" con la rampa RdBu y un rango de −6 a +6.

## `sme2/`: humedad del suelo NISAR
Producto **L3 SME2**: humedad volumétrica del suelo (m³/m³) calculada a partir del radar.

- `soil_moisture_AAAAMMDD.tif`: una por pasada disponible. Valor de 0 a ~0.6 m³/m³; `NaN` = sin dato (agua, urbano o filtrado).
- La media de la zona por fecha está en `manifest.json` → `sme2`.
- La proyección viene en el propio TIF (`src.crs`).

## Notas
- Las escenas de septiembre y octubre son **provisionales**: NASA puede reprocesarlas.
- Compara siempre escenas del **mismo track y frame**. Si mezclas geometrías distintas, el ΔdB se llena de ruido.
- Buscador visual: https://search.asf.alaska.edu (Dataset: NISAR).
