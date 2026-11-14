# Changelog

Todos los cambios relevantes de ChAgro se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[Versionado Semántico](https://semver.org/lang/es/).

## Cómo contribuir a este changelog

- Cada PR agrega su línea en **`[Unreleased]`**, bajo la categoría correcta.
- Categorías: `Agregado`, `Cambiado`, `Corregido`, `Eliminado`, `Datos` (cambios en JSON, GeoJSON o el pipeline NASA) y `Seguridad`.
- Formato de la línea: `- Descripción breve en presente (área) — @usuario`.
  Ejemplo: `- Capa de tiles SAR reales en el comparador (mapa) — @usuario`.
- Al publicar una versión, `[Unreleased]` se renombra a `[x.y.z] - AAAA-MM-DD` y se abre un `[Unreleased]` vacío.

## [Unreleased]

### Agregado

### Cambiado

### Corregido

### Datos

## [0.1.0] - 2026-11-14

### Agregado

- Estructura inicial con React 18 + Vite + TypeScript + Tailwind CSS (base)
- Visor público con Leaflet: imagen satelital Esri, parcelas coloreadas por estado SAR o por tipo de zona, máscara de agua y estaciones virtuales de canal, con popups (mapa)
- Comparador antes/después de escenas SAR con divisor arrastrable, que recorta los panes de Leaflet (mapa)
- Franja de KPIs: lluvia NASA POWER de 15 días, área con agua detectada vs. cuota sostenible, estero más bajo y gráfico de ET₀ vs. lluvia (kpi)
- ChAgro Copilot: chat estilo WhatsApp con chips rápidos por rol (comunidad / agricultor) y respuestas de respaldo sin conexión (copiloto)
- Login y registro con Supabase Auth, y modo demo con cuentas locales cuando no hay credenciales (auth)
- Panel del agricultor: parcelas, recomendación de riego con período de 7, 15 o 30 días, riego deficitario, balance de humedad del suelo y formulario de nueva parcela con su sistema de riego (agricultor)
- Motor agronómico en `src/lib/agro`: Penman-Monteith FAO-56 adaptado a NASA POWER, Kc por etapa, lluvia efectiva, modos de riego por planta y por área, percolación, energía de bombeo y balance RAW/TAW (motor)
- Funciones serverless `/api/chat`, `/api/recommend` y `/api/weather`; el rol se resuelve desde el token, nunca desde el body (backend)
- Esquema de Supabase con PostGIS, RLS por rol, bucket de Storage y catálogos semilla de cultivos y suelos (bd)
- Tests de Vitest: Ejemplo 18 de FAO-56, entradas de POWER y cálculos de riego (tests)

### Datos

- JSON simulados en `public/data`, generados con `scripts/generate-mock-data.mjs` con el mismo formato que entregará el pipeline NASA (ver `docs/DATA_CONTRACT.md`)
