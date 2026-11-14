# ChAgro — Plan de implementación

**Reto:** Dancing with the SARs (NASA Space Apps Challenge Guayaquil 2026)
**Objetivo:** Plataforma geoespacial + copiloto conversacional para auditoría transparente del agua agrícola y recomendaciones de riego en sequía, usando datos SAR y meteorológicos de la NASA.

---

## 1. Lógica de riego (inspirada en ShrimpDashboard › Irrigación Inteligente y Parcelas)

### Cálculo base (heredado)
1. ET₀ diaria (Penman-Monteith FAO-56).
2. ETc = Σ ET₀ × Kc (Kc según etapa del cultivo, `crop.stages[]`).
3. Lluvia efectiva (USDA): P < 75 mm → 0.8·P; si no → 0.6·P + 10.
4. Necesidad neta = max(0, ETc − Pef). Lámina bruta = neta ÷ eficiencia.
5. Modo por planta: volumen/planta = lámina × π·r²<sub>copa</sub>; total = × nº plantas; tiempo = volumen ÷ (caudal × emisores).

### Penman-Monteith: portar la versión del API
- Usar como referencia `bio_dynamics_api/api_rest_gateway/util/PenmanMonteith.js` (FAO-56 completo: Rns − Rnl, Rso, elevación; con tests en `expected_et0.json`).
- **No** usar `ShrimpDashboard/src/app/utils/PenmanMonteith.ts`: simplifica `Rn = Rs·86400/1e6` (sin albedo ni Rnl) y sobreestima ET₀.

### Adaptaciones para Guayas
- **Modo por área** (arroz y caña: inundación / surcos / aspersión): m³ = lámina(mm) × ha × 10. Arroz: sumar percolación (~2–6 mm/día en suelos arcillosos).
- **Balance hídrico diario FAO-56 (cap. 8)** para saber *cuándo* regar:
  - Dr<sub>i</sub> = Dr<sub>i−1</sub> − Pef + ETc<sub>i</sub> − I<sub>i</sub>
  - TAW = 1000·(θ<sub>CC</sub> − θ<sub>PMP</sub>)·Zr; RAW = p·TAW; regar cuando Dr > RAW.
  - **Dr inicial desde humedad de suelo NISAR SME2 / SMAP** → clave para "Best Use of Data".
- **Riego deficitario** (chip "reduce irrigation 25%"): ahorro en m³ y energía, kWh = V·H / (367·η<sub>bomba</sub>).

---

## 2. NASA POWER como entrada de Penman-Monteith

| Entrada FAO-56 | Parámetro POWER (`community=AG`) | Cuidado |
|---|---|---|
| Rs | `ALLSKY_SFC_SW_DWN` | Con `AG` en MJ/m²/día (con `RE` viene en kWh). |
| Tmax / Tmin | `T2M_MAX`, `T2M_MIN` | — |
| ea | `T2MDEW` (ec. 14 FAO-56) | POWER no trae HRmax/HRmin. Alternativa: `RH2M`. |
| u₂ | `WS2M` | Ya a 2 m. |
| P | `PS` | Viene en **kPa** (la clase del API espera hPa y multiplica por 0.1 → ajustar). |
| Lluvia | `PRECTOTCORR` | `-999` = faltante. |

- **Latencia:** POWER publica con unos días de retraso → rellenar con Open-Meteo (pasado reciente + pronóstico 72 h), guardando la fuente por día. Validar contra `et0_fao_evapotranspiration` de Open-Meteo.
- **GEOS-FP:** requiere OPeNDAP/NetCDF; en 48 h usar Open-Meteo en vivo y, opcional, un pronóstico GEOS-FP precalculado offline.
- **Resolución:** ~0.5° → el piloto de Daule cae en 1–2 celdas. La ET₀ es regional; lo que varía por parcela es Kc, suelo y sistema de riego.

---

## 3. Stack

| Capa | Elección | Motivo |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind | Pedido por el MD; ecosistema react-leaflet. |
| Mapa | Leaflet + react-leaflet + leaflet-side-by-side + leaflet-geoman | Geoman para que el agricultor dibuje su parcela. |
| Gráficos | Recharts | — |
| BD + Auth + Storage | Supabase (Postgres + PostGIS) | Roles con RLS, subida de archivos, consultas espaciales, gratis. |
| API | Funciones serverless de Vercel (`/api/chat`, `/api/recommend`, `/api/weather`) | Ocultan la key de Gemini y arman el contexto por rol. |
| Hosting | Vercel + Supabase | Deploy con `git push`. |
| IA | Gemini `gemini-2.5-flash` + `fallback_copilot.json` | — |
| Pipeline | Python: `earthaccess`, `rasterio`/`rioxarray`, `h5py`, `geopandas`, `rasterstats`, `mapshaper` | — |

Descartadas: MongoDB Atlas + Express en Render (cold start arruina la demo, auth aparte); Firebase (sin PostGIS).

> ⚠️ Supabase pausa proyectos gratuitos tras 7 días sin uso: despertarlo antes del pitch.

---

## 4. Roles y seguridad

| | Público (anónimo) | Agricultor (autenticado) |
|---|---|---|
| Mapa SAR, cobertura MAATE, estaciones, KPIs de cuenca | ✅ | ✅ |
| Polígonos de fincas con % de área regada detectada por SAR (dato satelital público) | ✅ | ✅ |
| Datos del sistema de riego (caudales, bombas, plantas) | ❌ solo agregados | ✅ solo los suyos (RLS) |
| Chat | Contexto de cuenca, estaciones y SAR | + su parcela y su recomendación |
| Registrar finca, parcela, sistema de riego; ver recomendaciones | ❌ | ✅ |

**Regla clave:** el contexto del chat se construye en el servidor según el rol del JWT, nunca según lo que envíe el cliente. El toggle "Farmer / Community" del MD corresponde a estos dos roles.

---

## 5. Esquema de base de datos (Postgres + PostGIS)

```
profiles(id → auth.users, role: 'public'|'farmer', full_name)
basins(id, name, geom MultiPolygon)                        -- Daule, Santa Elena
land_cover(id, cbn1, cbn2, anio, geom)                     -- capa MAATE ff010 recortada
crops(id, name, stages jsonb[{stage_name,kc,duration_days}], root_depth_m, p_depletion)
farms(id, owner_id, name, geom)
parcels(id, farm_id, name, geom Polygon, area_ha GENERATED, crop_id, planting_date, soil_type)
irrigation_systems(id, parcel_id, type, efficiency, mode 'per_plant'|'per_area',
                   flow_rate_lph, emitters, num_plants, canopy_radius_m,
                   system_flow_m3h, pump_kw, pump_head_m)
soil_types(id, name, theta_fc, theta_wp)                   -- arcilloso, franco, arenoso
weather_daily(cell_lat, cell_lng, date, tmax, tmin, tdew, rh, ws2m, rs, ps, precip, et0, source)
parcel_observations(parcel_id, date, sensor, sar_db, delta_db, water_pct, soil_moisture, ndvi)
virtual_stations(id, name, geom Point)
station_readings(station_id, ts, level_pct, trend, alert)
recommendations(id, parcel_id, start, end, et0_sum, kc, etc, peff, net_mm, gross_mm,
                volume_m3, time_min, depletion_mm, next_irrigation_date, created_at)
```

- Vista `v_public_parcels`: solo campos SAR y agregados, sin datos del sistema de riego.
- Semilla `crops` (FAO-56 tabla 12, Kc ini/mid/end): arroz 1.05/1.20/0.90, caña 0.40/1.25/0.75, banano 0.50/1.10/1.00, cacao 1.00/1.05/1.05, maíz 0.30/1.20/0.60.

---

## 6. Pipeline de datos (offline, antes de la demo)

| Dato | Fuente NASA | Uso |
|---|---|---|
| SAR base y actual | NISAR GCOV (recorte) | ΔdB, máscara de agua, estadísticas por parcela |
| Humedad de suelo SAR | NISAR SME2 | Dr inicial del balance |
| Lluvia, radiación, T°, HR, viento | POWER | ET₀ diaria |
| Pronóstico 72 h | GEOS-FP (o Open-Meteo en vivo) | Próximos riegos |
| NDVI | VIIRS VNP13A1 | Estado del cultivo en popup |
| Humedad de suelo regional | SMAP SPL3SMP_E | Dr inicial / contexto regional |

1. **Capa MAATE cobertura 2022** (19 963 polígonos): recortar al piloto, filtrar `cbn1 = TIERRA AGROPECUARIA`, reproyectar a EPSG:4326, simplificar con mapshaper a < 5 MB (si no, PMTiles).
2. **SAR:** recorte → ΔdB → umbral → máscara de agua → estadísticas por parcela en `parcel_observations`. Imágenes base/actual teseladas con `gdal2tiles` (leaflet-side-by-side funciona bien con TileLayers, no con ImageOverlay).
   - **Plan B:** OPERA DSWx-S1 / OPERA RTC-S1 (máscaras de agua ya derivadas de Sentinel-1).
3. **Humedad de suelo** (SME2, SMAP) por parcela.
4. **NDVI** VIIRS por parcela.
5. **POWER:** histórico de las celdas del piloto → `weather_daily` + exportar a `public/data/*.json` como respaldo offline.

---

## 7. Estructura del repo

```
chagro/
├─ src/                    # React app (mapa, copiloto, vistas de agricultor)
│  └─ lib/agro/            # Motor puro en TS, compartido con /api
│     ├─ penmanMonteith.ts # port FAO-56 del API, adaptado a POWER
│     ├─ kc.ts             # Kc por etapa / días desde siembra
│     ├─ waterBalance.ts   # Dr, TAW, RAW, próxima fecha de riego
│     └─ irrigation.ts     # por planta / por área, déficit, energía
├─ api/                    # Vercel functions: chat, recommend, weather
├─ pipeline/               # Python (earthaccess, rasterio, geopandas)
├─ supabase/               # migraciones SQL, RLS, seed (crops, soils)
├─ public/data/            # GeoJSON + fallback_copilot.json + tiles SAR
└─ tests/                  # FAO-56 Ejemplo 18 + fixtures POWER
```

**Copiloto:** el LLM no calcula; `lib/agro` produce los números y Gemini los explica. Prompt de sistema por rol con JSON de parcela, KPIs y recomendación. Español en la app, inglés en el video.

---

## 8. Cronograma 48 h (4 frentes en paralelo)

| Horas | Datos/GIS | Backend/BD | Frontend | Motor + Copiloto |
|---|---|---|---|---|
| 0–6 | Recorte MAATE + descarga SAR, SMAP, POWER | Supabase, migraciones, RLS, semillas | Vite, layout, mapa base | Port PM + tests FAO-56 |
| 6–14 | ΔdB, máscara, tiles, stats por parcela | Carga GeoJSON a PostGIS | Capas, popups, slider antes/después | Kc, balance hídrico, modos de riego |
| 14–22 | Estaciones virtuales simuladas | `/api/weather` (POWER + Open-Meteo) | KPIs, toggle de rol, login, dibujo de parcela | `/api/recommend` + vista de recomendación |
| 22–28 | Respaldo `public/data` | `/api/chat` con contexto por rol | Panel de chat + chips | Prompts + `fallback_copilot.json` |
| 28–36 | — | Deploy Vercel, despertar Supabase | Pruebas en móvil | Guion del video de 30 s en inglés |

---

## 9. Recomendaciones clave
1. Portar `PenmanMonteith.js` del API, no el del frontend.
2. ea con `T2MDEW`; `PS` viene en kPa.
3. Modo por área para arroz y caña (indispensable en Daule).
4. Balance hídrico con humedad SAR/SMAP como punto de partida = mejor carta para "Best Use of Data".
5. Respaldo estático para todo: GeoJSON, clima, respuestas del chat.
6. Tener OPERA DSWx-S1 listo por si NISAR no cubre la zona.
