# ChAgro — SAR Water Transparency Monitor

Plataforma geoespacial y copiloto conversacional para auditar de forma transparente el agua agrícola
y recomendar riego en época seca con datos de la NASA.
**NASA Space Apps Challenge Guayaquil 2026 · Dancing with the SARs.**

> ⚠️ **Prototipo:** los datos NASA son **simulados** (`public/data`) con el formato final.
> La integración real va en `pipeline/` (ver `docs/DATA_CONTRACT.md`).

## Inicio rápido

Requisito: Node 20 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:5173. Sin variables de entorno la app corre en **modo demo**:
- La autenticación se simula en el navegador. En `/login` hay botones de "Agricultor demo" y "Comunidad demo".
- El copiloto responde con `public/data/fallback_copilot.json`.

Las funciones `/api/*` corren dentro de `npm run dev` gracias a `dev-api-plugin.ts`, así que no hace falta `vercel dev`.

### Con Supabase y Gemini

1. Copia `.env.example` a `.env.local` y completa las claves.
2. En tu proyecto de Supabase, ejecuta `supabase/migrations/*.sql` y luego `supabase/seed.sql`, ya sea desde el SQL Editor o con `supabase db push`.
3. Reinicia `npm run dev`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (frontend + `/api`) |
| `npm run build` | Typecheck + build de producción |
| `npm test` | Tests del motor agronómico (Vitest) |
| `node scripts/generate-mock-data.mjs` | Regenera los JSON simulados |

## Arquitectura

```
src/
  pages/          Viewer (público), Login, FarmerDashboard
  components/     map/ (Leaflet + comparador SAR), kpi/, copilot/, farmer/, layout/
  lib/agro/       Motor puro: Penman-Monteith FAO-56, Kc, riego, balance hídrico
  lib/summary.ts  KPIs de cuenca y recomendación por parcela (compartido con /api)
  context/        AuthContext (Supabase o demo)
api/              Funciones serverless (Vercel): chat, recommend, weather
supabase/         Migraciones SQL (PostGIS + RLS) y seed
public/data/      Datos simulados con el formato del pipeline NASA
docs/             Contrato de datos
```

### Roles

| | Público | Agricultor |
|---|---|---|
| Visor, KPIs, estaciones, SAR por parcela | ✅ | ✅ |
| Copiloto con contexto de cuenca | ✅ | ✅ |
| Registrar parcelas y sistema de riego | ❌ | ✅ |
| Recomendaciones de riego y copiloto con datos propios | ❌ | ✅ |

El rol se resuelve **en el servidor** desde el JWT de Supabase (o el token demo), nunca desde el body.

### Motor de recomendación

Está inspirado en el componente Irrigación Inteligente de ShrimpDashboard:

1. ET₀ diaria con Penman-Monteith FAO-56 a partir de NASA POWER (`T2MDEW` para ea, `PS` en kPa).
2. ETc = Σ ET₀ × Kc (según la etapa del cultivo desde la siembra).
3. Necesidad neta = ETc + percolación − lluvia efectiva. Lámina bruta = neta ÷ eficiencia.
4. Volumen **por planta** (goteo: π·r² × lámina × nº de plantas) o **por área** (inundación o surcos: mm × ha × 10).
5. Balance de humedad: el agotamiento actual se estima con la humedad SAR y se compara con RAW = p·TAW para saber cuándo regar.

## Despliegue

Vercel (frontend + `/api`) y Supabase (BD, Auth y Storage). `vercel.json` ya incluye `public/data` en las funciones.
Hay que configurar en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) y registra tus cambios en [CHANGELOG.md](CHANGELOG.md).
