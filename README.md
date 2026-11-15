# ChAgro — SAR Water Transparency Monitor

Visor geoespacial y copiloto para auditar el agua agrícola y recomendar riego en época seca con datos NASA.
**NASA Space Apps Challenge Guayaquil 2026 · Dancing with the SARs.**

## Inicio rápido

Requiere Node 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173. La app es una **demo estática**:
- **Login demo**: se entra como agricultor o como comunidad con un botón, sin contraseña.
- **Parcelas del agricultor**: se crean con el formulario o dibujando el polígono en el mapa, y se guardan en el navegador (localStorage).
- **Copiloto**: responde en el navegador con los datos del mapa y la fecha elegida en el slider (`src/lib/copilot/context.ts`). Opcional en local: con `GROQ_API_KEY` en `.env.local`, `npm run dev` usa IA a través de `api/chat.ts`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | App en local (y `/api/chat` si hay clave de IA) |
| `npm run build` | Typecheck + build de producción |
| `npm test` | Tests del motor agronómico |

## Datos

| Archivo en `public/data/` | Origen |
|---|---|
| `weather_daily.json` | **NASA**: POWER (histórico) + GEOS-FP (pronóstico) |
| `sar_irrigation_anomalies.geojson`, `sar_water_mask_*.geojson` | **NASA**: NISAR, SMAP, VIIRS + parcelas de MapBiomas |
| `sar_timeline.json`, `sar_water_timeline.geojson`, `hv_images.json`, `hv/` | **NASA**: línea de tiempo NISAR (agua, vegetación HV) + lluvia POWER y SMAP |
| `basins.json` | Configuración: cuencas `daule` y `santa-elena` |
| `farmer_demo.json` | Simulado (modo agricultor demo) |
| `fallback_copilot.json` | Respuestas del copiloto sin IA |

Los datos NASA se generan con [`pipeline/`](pipeline/README.md), que también describe el formato de cada archivo.

## Estructura

```
src/            Frontend React: pages, components (mapa, KPIs, copiloto), lib/agro (FAO-56, riego)
api/            chat.ts: proxy opcional a Groq/Gemini (solo en desarrollo)
pipeline/       Descarga y procesamiento de datos NASA (Python)
public/data/    Datos que lee la app
scripts/        Plugin para correr /api/chat en desarrollo
.github/        Workflow de despliegue a GitHub Pages
tests/          Tests del motor agronómico (Vitest)
```

## Despliegue

GitHub Pages, con `.github/workflows/deploy-pages.yml`: cada push a `main` compila con `VITE_BASE=/<repo>/` y publica `dist/`. Hay que activarlo una vez en **Settings → Pages → Source: GitHub Actions**. La app queda en `https://<usuario>.github.io/<repo>/`.
