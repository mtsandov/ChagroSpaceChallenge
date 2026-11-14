/**
 * Resúmenes de cuenca y de parcela del agricultor. Se usan en el frontend (KPIs)
 * y en el backend (contexto del copiloto), así ambos muestran los mismos números.
 * Importar solo con rutas relativas: lo consumen también las funciones de /api.
 */
import type {
  Basin,
  BasinWeather,
  FarmerParcel,
  SarParcelCollection,
  VirtualStation,
} from '../types';
import { et0FromPower } from './agro/power';
import { stageForDate } from './agro/kc';
import { computeRecommendation, type Recommendation } from './agro/irrigation';
import { findCrop, findSoil } from '../data/crops';

export interface BasinSummary {
  basin: Basin;
  rain15: number;
  et0Avg7: number;
  irrigatedHa: number;
  quotaPct: number;
  excessive: string[];
  deficit: string[];
  lowestStation: VirtualStation | null;
  dailyEt0: { date: string; et0: number | null; rainfall: number }[];
}

export function summarizeBasin(
  basin: Basin,
  weather: BasinWeather,
  parcels: SarParcelCollection,
  stations: VirtualStation[],
): BasinSummary {
  const dailyEt0 = et0FromPower(weather.daily, weather.location.lat, weather.location.elevation_m);
  const last15 = dailyEt0.slice(-15);
  const last7 = dailyEt0.slice(-7).filter((d) => d.et0 !== null);
  const own = parcels.features.filter((f) => f.properties.basin_id === basin.id);
  const irrigatedHa = own.reduce((s, f) => s + f.properties.irrigated_area_ha, 0);
  const ownStations = stations.filter((s) => s.basin_id === basin.id);
  const lowestStation = ownStations.reduce<VirtualStation | null>(
    (lo, s) => (lo === null || s.canal_level_pct < lo.canal_level_pct ? s : lo),
    null,
  );

  return {
    basin,
    rain15: round(last15.reduce((s, d) => s + d.rainfall, 0), 1),
    et0Avg7: round(last7.reduce((s, d) => s + (d.et0 ?? 0), 0) / Math.max(last7.length, 1), 2),
    irrigatedHa: round(irrigatedHa, 0),
    quotaPct: Math.round(((irrigatedHa - basin.sustainable_quota_ha) / basin.sustainable_quota_ha) * 100),
    excessive: own.filter((f) => f.properties.status === 'excessive').map((f) => f.properties.name),
    deficit: own.filter((f) => f.properties.status === 'deficit').map((f) => f.properties.name),
    lowestStation,
    dailyEt0,
  };
}

export interface FarmerRecommendationResult {
  parcel: FarmerParcel;
  cropName: string;
  stageName: string;
  daysSincePlanting: number;
  soilName: string;
  soilMoisture?: number;
  recommendation: Recommendation;
}

/** Recomendación para una parcela del agricultor con los últimos `days` días de clima. */
export function recommendForParcel(
  parcel: FarmerParcel,
  weather: BasinWeather,
  opts: { days?: number; deficitFraction?: number; soilMoisture?: number; asOf?: string } = {},
): FarmerRecommendationResult {
  const crop = findCrop(parcel.crop_id);
  const soil = findSoil(parcel.soil_type_id);
  if (!crop || !soil) throw new Error(`Cultivo o suelo desconocido para ${parcel.id}`);

  const days = opts.days ?? 7;
  const history = et0FromPower(weather.daily, weather.location.lat, weather.location.elevation_m).slice(-days);
  const asOf = opts.asOf ?? weather.daily[weather.daily.length - 1]?.date ?? new Date().toISOString().slice(0, 10);
  const stage = stageForDate(crop, parcel.planting_date, asOf);

  const recommendation = computeRecommendation({
    history,
    forecastEt0: weather.forecast.daily.map((d) => d.et0_fao_evapotranspiration),
    kc: stage.kc,
    crop,
    soil,
    system: parcel.irrigation,
    areaHa: parcel.area_ha,
    soilMoisture: opts.soilMoisture,
    deficitFraction: opts.deficitFraction,
  });

  return {
    parcel,
    cropName: crop.name,
    stageName: stage.stageName,
    daysSincePlanting: stage.daysSincePlanting,
    soilName: soil.name,
    soilMoisture: opts.soilMoisture,
    recommendation,
  };
}

const round = (v: number, d: number) => Number(v.toFixed(d));
