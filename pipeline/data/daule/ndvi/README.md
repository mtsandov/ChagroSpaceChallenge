# NASA VIIRS VNP13A1 · NDVI / EVI (vigor de la vegetación)

**Qué es:** índices de vegetación del sensor VIIRS (satélite Suomi-NPP). Cada archivo es un compuesto de 16 días que toma el mejor píxel sin nubes de ese periodo.
**Resolución:** 500 m · **Tiles:** h09v09 + h10v09 (la cuenca cae justo en el borde, así que cada fecha es un **mosaico** de ambos) · **Recorte:** la bbox de Daule

## Archivos
- `ndvi_AAAA-MM-DD.tif`: NDVI. La fecha es el **inicio** del compuesto de 16 días.
- `evi_AAAA-MM-DD.tif`: EVI, que se satura menos en cultivos densos.
- `ndvi_serie.csv`: promedio de la zona por fecha (`fecha_inicio, ndvi_medio, evi_medio, tiles`).

## Valores
- Rango: −1 a 1, ya escalado. Los píxeles sin dato son `NaN`.
- Guía rápida: `< 0.2` es suelo desnudo o agua · `0.2–0.5` es cultivo en crecimiento o vegetación rala · `> 0.5` es vegetación densa o cultivo maduro.

## Proyección
Los TIF están en **proyección sinusoidal de MODIS** (no en lat/lon). Para usarlos en Leaflet o QGIS conviene reproyectarlos:
```bash
gdalwarp -t_srs EPSG:4326 ndvi_2026-10-08.tif ndvi_2026-10-08_wgs84.tif
```
```python
import rasterio
with rasterio.open("ndvi_2026-10-08.tif") as src:
    ndvi = src.read(1); print(src.crs, ndvi.shape)
```

Producto: https://lpdaac.usgs.gov/products/vnp13a1v002/
