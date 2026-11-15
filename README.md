# ChAgro — SAR Water Transparency Monitor

Visor geoespacial y copiloto para auditar el agua agrícola y recomendar riego en época seca con datos NASA.
**NASA Space Apps Challenge Guayaquil 2026 · Dancing with the SARs.**

## Inicio rápido

Requiere Node 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Sin variables de entorno, la app corre en **modo demo**: el login se simula y el copiloto responde con `public/data/fallback_copilot.json`. Las funciones `/api/*` corren dentro de `npm run dev`.

Para usar Supabase y Gemini:
1. Copia `.env.example` a `.env.local` y completa las claves.
2. Ejecuta `supabase/migrations/*.sql` y luego `supabase/seed.sql`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Frontend + `/api` en local |
| `npm run build` | Typecheck + build de producción |
| `npm test` | Tests del motor agronómico |

## Datos

| Archivo en `public/data/` | Origen |
|---|---|
| `weather_daily.json` | **NASA**: POWER (histórico) + GEOS-FP (pronóstico) |
| `sar_irrigation_anomalies.geojson`, `sar_water_mask_*.geojson` | **NASA**: NISAR, SMAP, VIIRS + parcelas de MapBiomas |
| `basins.json` | Configuración: cuencas `daule` y `santa-elena` |
| `virtual_stations.json`, `farmer_demo.json` | Simulados |
| `fallback_copilot.json` | Respuestas sin conexión |

Los datos NASA se generan con [`pipeline/`](pipeline/README.md), que también describe el formato de cada archivo.

## Estructura

```
src/            Frontend React: pages, components (mapa, KPIs, copiloto), lib/agro (FAO-56, riego)
api/            Funciones serverless (Vercel): chat (Gemini), recommend, weather
pipeline/       Descarga y procesamiento de datos NASA (Python)
public/data/    Datos que lee la app
supabase/       Migraciones SQL (PostGIS + RLS) y seed
scripts/        Plugin para correr /api en desarrollo
tests/          Tests del motor agronómico (Vitest)
```

El rol del usuario (público o agricultor) se resuelve **en el servidor** desde el token, nunca desde el body.

## Despliegue

Vercel (frontend + `/api`) y Supabase. Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`.

## Contribuir

- Crea una rama desde `main` (`feat/…`, `fix/…`, `data/…`) y abre un PR. Usa commits en formato [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).
- Antes del PR: `npm test` y `npm run build`.
- **Nunca** subas claves. Las variables con prefijo `VITE_` llegan al navegador, así que la key de Gemini y la service role de Supabase no lo llevan.
- Los números salen de `src/lib/agro`; Gemini solo los explica.
- Los módulos que también usa `/api` (`src/lib/agro`, `src/lib/summary.ts`, `src/data`, `src/types`) se importan con rutas relativas, no con `@/`.
