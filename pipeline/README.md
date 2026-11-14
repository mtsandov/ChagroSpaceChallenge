# Pipeline de datos NASA

Esta carpeta es para los scripts de Python que descargan y procesan los datos NASA
(NISAR GCOV/SME2, SMAP, VIIRS, POWER) y generan los archivos de `public/data/`.

- **Formato de salida:** ver [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md).
- **No versionar** rasters ni descargas: `pipeline/raw/` y `pipeline/out/` están en `.gitignore`.
- Librerías sugeridas: `earthaccess`, `rasterio`, `rioxarray`, `h5py`, `geopandas`, `rasterstats`, `requests`.

Para comparar contra los datos simulados actuales:

```bash
node scripts/generate-mock-data.mjs
```
