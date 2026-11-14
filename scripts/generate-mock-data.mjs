/**
 * Genera los JSON SIMULADOS de /public/data.
 *
 * Mantiene el MISMO formato que producirá el pipeline real de la NASA
 * (ver docs/DATA_CONTRACT.md). Cuando el pipeline esté listo basta con
 * sobrescribir los archivos de /public/data con los reales.
 *
 *   node scripts/generate-mock-data.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
mkdirSync(OUT, { recursive: true });

// PRNG determinista (mulberry32) para que los datos no cambien entre ejecuciones
let seed = 20261114;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a, b) => a + (b - a) * rand();
const round = (v, d = 2) => Number(v.toFixed(d));

/** Polígono irregular alrededor de un centro. size en grados (~0.01° ≈ 1.1 km). */
function blob([lat, lng], sizeLat, sizeLng, points = 9, jitter = 0.25) {
  const ring = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = 1 - jitter / 2 + rand() * jitter;
    ring.push([round(lng + Math.cos(a) * sizeLng * r, 6), round(lat + Math.sin(a) * sizeLat * r, 6)]);
  }
  ring.push(ring[0]);
  return ring;
}

/** Área aproximada de un anillo [lng,lat] en hectáreas (proyección equirectangular local). */
function areaHa(ring) {
  const lat0 = (ring.reduce((s, p) => s + p[1], 0) / ring.length) * (Math.PI / 180);
  const mx = 111320 * Math.cos(lat0);
  const my = 110540;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = [ring[i][0] * mx, ring[i][1] * my];
    const [x2, y2] = [ring[i + 1][0] * mx, ring[i + 1][1] * my];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2) / 10000;
}

// ---------------------------------------------------------------------------
// Cuencas piloto
// ---------------------------------------------------------------------------
const basins = [
  {
    id: 'daule',
    name: 'Cuenca Baja del Guayas – Daule',
    short_name: 'Daule',
    center: [-1.865, -79.985],
    zoom: 13,
    sustainable_quota_ha: 600,
    description: 'Zona arrocera y cañera del bajo Guayas, con esteros comunitarios aguas abajo.',
  },
  {
    id: 'santa-elena',
    name: 'Canal Trasvase – Santa Elena',
    short_name: 'Santa Elena',
    center: [-2.235, -80.585],
    zoom: 13,
    sustainable_quota_ha: 430,
    description: 'Área semiárida abastecida por el trasvase Chongón–Sube y Baja.',
  },
];

// ---------------------------------------------------------------------------
// Parcelas con anomalías SAR (sar_irrigation_anomalies.geojson)
// ---------------------------------------------------------------------------
const parcelSpecs = {
  daule: [
    ['HACIENDA_NORTE_01', 'Hacienda Norte 01', 'commercial_farm', 'Arroz', [-1.848, -79.995], 0.011, 0.014, 'excessive'],
    ['HACIENDA_NORTE_02', 'Hacienda Norte 02', 'commercial_farm', 'Caña de azúcar', [-1.852, -79.968], 0.009, 0.012, 'excessive'],
    ['AGRO_EL_ROSARIO', 'Agrícola El Rosario', 'commercial_farm', 'Arroz', [-1.873, -80.006], 0.008, 0.01, 'normal'],
    ['FINCA_SAN_JOSE', 'Finca San José', 'smallholder', 'Banano', [-1.879, -79.972], 0.004, 0.005, 'normal'],
    ['FINCA_LAS_PALMAS', 'Finca Las Palmas', 'smallholder', 'Cacao', [-1.884, -79.99], 0.0035, 0.0045, 'deficit'],
    ['COMUNA_LA_VICTORIA', 'Comuna La Victoria', 'community', 'Maíz', [-1.862, -79.979], 0.005, 0.006, 'deficit'],
    ['COMUNA_PUEBLO_NUEVO', 'Comuna Pueblo Nuevo', 'community', 'Arroz', [-1.892, -79.962], 0.005, 0.0065, 'deficit'],
  ],
  'santa-elena': [
    ['AGROEXPORT_CERECITA', 'Agroexportadora Cerecita', 'commercial_farm', 'Mango', [-2.222, -80.6], 0.01, 0.013, 'excessive'],
    ['HACIENDA_SUBE_BAJA', 'Hacienda Sube y Baja', 'commercial_farm', 'Banano', [-2.244, -80.567], 0.008, 0.011, 'normal'],
    ['FINCA_EL_AZUCAR', 'Finca El Azúcar', 'smallholder', 'Maíz', [-2.253, -80.592], 0.004, 0.005, 'deficit'],
    ['COMUNA_SACACHUN', 'Comuna Sacachún', 'community', 'Maíz', [-2.229, -80.575], 0.0045, 0.006, 'deficit'],
  ],
};

const statusLabels = {
  excessive: 'Exceso de agua superficial detectado',
  normal: 'Riego dentro de lo esperado',
  deficit: 'Déficit hídrico / suelo seco',
};

const parcelFeatures = [];
const waterBaseline = [];
const waterCurrent = [];

for (const [basinId, specs] of Object.entries(parcelSpecs)) {
  for (const [id, name, zone, crop, center, sLat, sLng, status] of specs) {
    const ring = blob(center, sLat, sLng, 10, 0.2);
    const area = round(areaHa(ring), 1);
    const irrigated =
      status === 'excessive' ? between(70, 85) : status === 'normal' ? between(35, 55) : between(3, 15);
    const baseline = between(2, 8);
    const backscatter = status === 'excessive' ? between(-19.5, -17) : status === 'normal' ? between(-14, -11) : between(-9, -7);
    const delta = status === 'excessive' ? between(-7, -5) : status === 'normal' ? between(-3.5, -2) : between(-0.8, 0.4);

    parcelFeatures.push({
      type: 'Feature',
      properties: {
        parcel_id: id,
        name,
        basin_id: basinId,
        zone_type: zone,
        crop,
        area_hectares: area,
        irrigated_area_pct: round(irrigated, 1),
        irrigated_area_ha: round((area * irrigated) / 100, 1),
        baseline_water_pct: round(baseline, 1),
        sar_backscatter_db: round(backscatter, 1),
        sar_delta_db: round(delta, 1),
        soil_moisture_m3m3: round(status === 'excessive' ? between(0.42, 0.5) : status === 'normal' ? between(0.28, 0.36) : between(0.12, 0.19), 2),
        ndvi: round(status === 'deficit' ? between(0.25, 0.4) : between(0.55, 0.8), 2),
        status,
        status_label: statusLabels[status],
        observation_date: '2026-11-10',
        baseline_date: '2026-08-15',
        sensor: 'NISAR GCOV (simulado)',
      },
      geometry: { type: 'Polygon', coordinates: [ring] },
    });

    // Máscaras de agua: manchas dentro de la parcela
    const nCurrent = status === 'excessive' ? 4 : status === 'normal' ? 2 : 0;
    for (let i = 0; i < nCurrent; i++) {
      const c = [center[0] + between(-sLat, sLat) * 0.5, center[1] + between(-sLng, sLng) * 0.5];
      const k = status === 'excessive' ? 0.45 : 0.3;
      waterCurrent.push({
        type: 'Feature',
        properties: { parcel_id: id, basin_id: basinId, scene: 'current', water_class: 'irrigation' },
        geometry: { type: 'Polygon', coordinates: [blob(c, sLat * k, sLng * k, 8, 0.4)] },
      });
    }
    if (rand() > 0.5) {
      const c = [center[0] + between(-sLat, sLat) * 0.4, center[1] + between(-sLng, sLng) * 0.4];
      waterBaseline.push({
        type: 'Feature',
        properties: { parcel_id: id, basin_id: basinId, scene: 'baseline', water_class: 'residual' },
        geometry: { type: 'Polygon', coordinates: [blob(c, sLat * 0.12, sLng * 0.12, 7, 0.4)] },
      });
    }
  }
}

const fc = (features) => ({ type: 'FeatureCollection', features });

// ---------------------------------------------------------------------------
// Estaciones virtuales (virtual_stations.json)
// ---------------------------------------------------------------------------
const stationSpecs = [
  ['EST_COMUNIDAD_SUR', 'Estero Comunitario La Victoria', 'daule', -1.866, -79.976, 24, 'decreasing', 'critical_low'],
  ['EST_CANAL_NORTE', 'Canal de Riego Norte', 'daule', -1.845, -79.982, 61, 'stable', 'normal'],
  ['EST_PUEBLO_NUEVO', 'Estero Pueblo Nuevo', 'daule', -1.895, -79.958, 38, 'decreasing', 'warning'],
  ['EST_SACACHUN', 'Reservorio Comunal Sacachún', 'santa-elena', -2.226, -80.571, 19, 'decreasing', 'critical_low'],
  ['EST_TRASVASE_KM12', 'Canal Trasvase Km 12', 'santa-elena', -2.238, -80.61, 72, 'stable', 'normal'],
];
const stations = stationSpecs.map(([id, name, basin, lat, lng, level, trend, alert]) => {
  const history = [];
  let v = trend === 'decreasing' ? level + between(25, 35) : level + between(-4, 4);
  for (let d = 13; d >= 0; d--) {
    const date = new Date(Date.UTC(2026, 10, 14 - d)).toISOString().slice(0, 10);
    if (d === 0) v = level;
    history.push({ date, level_pct: round(Math.max(0, v), 1) });
    v += trend === 'decreasing' ? -between(1.5, 3) : between(-1.5, 1.5);
  }
  return {
    station_id: id,
    name,
    basin_id: basin,
    lat,
    lng,
    canal_level_pct: level,
    flow_trend: trend,
    alert_level: alert,
    last_updated: '2026-11-14T09:30:00Z',
    history,
  };
});

// ---------------------------------------------------------------------------
// Clima diario estilo NASA POWER (weather_daily.json) + pronóstico Open-Meteo
// ---------------------------------------------------------------------------
const climate = {
  daule: { lat: -1.865, lng: -79.985, elevation: 12, tmax: 31.5, tmin: 22.3, tdew: 20.1, ws: 2.3, rs: 17.2, ps: 101.05 },
  'santa-elena': { lat: -2.235, lng: -80.585, elevation: 45, tmax: 29.4, tmin: 21.2, tdew: 18.6, ws: 3.1, rs: 15.8, ps: 100.7 },
};
const weather = {};
for (const [basinId, c] of Object.entries(climate)) {
  const daily = [];
  for (let d = 29; d >= 0; d--) {
    const date = new Date(Date.UTC(2026, 10, 14 - d)).toISOString().slice(0, 10);
    const tmax = c.tmax + between(-1.2, 1.2);
    const tmin = c.tmin + between(-0.8, 0.8);
    const tdew = Math.min(tmin - 0.5, c.tdew + between(-0.8, 0.8));
    const tmean = (tmax + tmin) / 2;
    const es = 0.6108 * Math.exp((17.27 * tmean) / (tmean + 237.3));
    const ea = 0.6108 * Math.exp((17.27 * tdew) / (tdew + 237.3));
    daily.push({
      date,
      T2M_MAX: round(tmax, 2),
      T2M_MIN: round(tmin, 2),
      T2MDEW: round(tdew, 2),
      RH2M: round(Math.min(100, (ea / es) * 100), 1),
      WS2M: round(c.ws + between(-0.6, 0.6), 2),
      ALLSKY_SFC_SW_DWN: round(c.rs + between(-2, 2), 2),
      PS: round(c.ps + between(-0.15, 0.15), 2),
      // Estación seca: 0 mm salvo una garúa aislada en Daule hace 3 semanas
      PRECTOTCORR: basinId === 'daule' && d === 21 ? 1.4 : 0,
    });
  }
  const forecast = [];
  for (let d = 1; d <= 3; d++) {
    const date = new Date(Date.UTC(2026, 10, 14 + d)).toISOString().slice(0, 10);
    forecast.push({
      date,
      temperature_2m_max: round(c.tmax + between(-1, 1), 1),
      temperature_2m_min: round(c.tmin + between(-1, 1), 1),
      precipitation_sum: 0,
      precipitation_probability_max: Math.round(between(3, 12)),
      et0_fao_evapotranspiration: round(between(3.8, 4.6), 2),
    });
  }
  weather[basinId] = {
    source: 'NASA POWER daily point API (simulado)',
    community: 'AG',
    units: { T2M_MAX: '°C', T2M_MIN: '°C', T2MDEW: '°C', RH2M: '%', WS2M: 'm/s', ALLSKY_SFC_SW_DWN: 'MJ/m²/día', PS: 'kPa', PRECTOTCORR: 'mm/día' },
    location: { lat: c.lat, lng: c.lng, elevation_m: c.elevation },
    daily,
    forecast: { source: 'Open-Meteo forecast (simulado)', daily: forecast },
  };
}

// ---------------------------------------------------------------------------
// Fincas del agricultor demo (farmer_demo.json) — lo que en producción vive en Supabase
// ---------------------------------------------------------------------------
const farmerParcels = [
  {
    id: 'demo-parcel-rice',
    name: 'Lote Arroz 1',
    basin_id: 'daule',
    crop_id: 'rice',
    planting_date: '2026-09-20',
    soil_type_id: 'clay',
    area_ha: 12.5,
    center: [-1.873, -80.006],
    irrigation: { type: 'flood', mode: 'per_area', efficiency: 60, system_flow_m3h: 180, pump_kw: 22, pump_head_m: 8, percolation_mm_day: 3 },
  },
  {
    id: 'demo-parcel-banana',
    name: 'Lote Banano Goteo',
    basin_id: 'daule',
    crop_id: 'banana',
    planting_date: '2026-03-01',
    soil_type_id: 'loam',
    area_ha: 4.2,
    center: [-1.879, -79.972],
    irrigation: { type: 'drip', mode: 'per_plant', efficiency: 90, num_plants: 7400, canopy_radius_m: 1.2, flow_rate_lph: 4, emitters: 2, pump_kw: 7.5, pump_head_m: 25 },
  },
];

const write = (name, data) => {
  writeFileSync(resolve(OUT, name), JSON.stringify(data, null, 2) + '\n');
  console.log('✔', name);
};

write('basins.json', basins);
write('sar_irrigation_anomalies.geojson', fc(parcelFeatures));
write('sar_water_mask_baseline.geojson', fc(waterBaseline));
write('sar_water_mask_current.geojson', fc(waterCurrent));
write('virtual_stations.json', stations);
write('weather_daily.json', weather);
write('farmer_demo.json', farmerParcels);
