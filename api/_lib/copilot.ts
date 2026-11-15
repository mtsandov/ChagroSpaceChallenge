import type { Role, Selection } from '../../src/types';
import { summarizeBasin, recommendForParcel, type FarmerRecommendationResult } from '../../src/lib/summary';
import { fillTemplate } from '../../src/lib/copilot/chips';
import { getBasins, getFallback, getFarmerParcels, getParcels, getStations, getWeather } from './data';

export interface CopilotContext {
  role: Role;
  data: Record<string, unknown>;
  templateValues: Record<string, string | number>;
}

/**
 * Construye el contexto que se inyecta a Gemini. El rol viene del token (ver auth.ts):
 * el contexto público NUNCA incluye datos privados del sistema de riego.
 */
export async function buildContext(opts: {
  role: Role;
  userId: string | null;
  basinId: string;
  selection: Selection;
  farmerParcelId?: string;
}): Promise<CopilotContext> {
  const [basins, parcels, stations, weatherAll] = await Promise.all([getBasins(), getParcels(), getStations(), getWeather()]);
  const basin = basins.find((b) => b.id === opts.basinId) ?? basins[0];
  const weather = weatherAll[basin.id];
  const summary = summarizeBasin(basin, weather, parcels, stations);

  const selectedParcel =
    opts.selection?.kind === 'parcel' ? parcels.features.find((f) => f.properties.parcel_id === opts.selection!.id) : undefined;
  const selectedStation =
    opts.selection?.kind === 'station' ? stations.find((s) => s.station_id === opts.selection!.id) : undefined;

  const data: Record<string, unknown> = {
    basin: { name: basin.name, sustainable_quota_ha: basin.sustainable_quota_ha },
    nasa_power: { rain_last_15_days_mm: summary.rain15, et0_avg_last_7_days_mm: summary.et0Avg7 },
    sar: {
      irrigated_area_ha: summary.irrigatedHa,
      above_quota_pct: summary.quotaPct,
      parcels_with_excess_water: summary.excessive,
      parcels_with_deficit: summary.deficit,
    },
    community_stations: stations
      .filter((s) => s.basin_id === basin.id)
      .map((s) => ({ name: s.name, level_pct: s.canal_level_pct, trend: s.flow_trend, alert: s.alert_level })),
    forecast_72h: weather.forecast.daily,
    selected_parcel: selectedParcel?.properties ?? null,
    selected_station: selectedStation ? { ...selectedStation, history: undefined } : null,
  };

  const templateValues: Record<string, string | number> = {
    basin: basin.name,
    rain15: summary.rain15,
    et0_avg: summary.et0Avg7,
    irrigated_ha: summary.irrigatedHa,
    quota_pct: summary.quotaPct,
    excessive_list: summary.excessive.join(', ') || 'ninguna',
    n_excessive: summary.excessive.length,
    n_deficit: summary.deficit.length,
    lowest_station: summary.lowestStation?.name ?? '—',
    lowest_level: summary.lowestStation?.canal_level_pct ?? '—',
  };

  if (opts.role === 'farmer' && opts.userId) {
    const own = await getFarmerParcels(opts.userId);
    const parcel = own.find((p) => p.id === opts.farmerParcelId) ?? own.find((p) => p.basin_id === basin.id) ?? own[0];
    if (parcel) {
      const rec: FarmerRecommendationResult = recommendForParcel(parcel, weatherAll[parcel.basin_id], {
        deficitFraction: 0.25,
        soilMoisture: selectedParcel?.properties.soil_moisture_m3m3,
      });
      const r = rec.recommendation;
      const fullVolume = r.volumeM3 + r.savedM3;
      data.my_parcel = {
        name: parcel.name,
        crop: rec.cropName,
        stage: rec.stageName,
        kc: r.kc,
        irrigation_type: parcel.irrigation.type,
        area_ha: parcel.area_ha,
        last_days: r.days,
        etc_mm: round(r.etcSum),
        effective_rain_mm: round(r.effectiveRainfallSum),
        gross_irrigation_mm: round(r.grossMm / (1 - r.deficitFraction)),
        volume_m3: round(fullVolume),
        irrigation_time_h: round(r.irrigationTimeH / (1 - r.deficitFraction)),
        days_until_next_irrigation: r.daysUntilIrrigation,
        deficit_25pct: { saved_m3: round(r.savedM3), saved_kwh: round(r.savedKwh) },
      };
      Object.assign(templateValues, {
        parcel: parcel.name,
        gross_mm: round(r.grossMm / (1 - r.deficitFraction)),
        volume_m3: round(fullVolume),
        days: r.days,
        time_h: round(r.irrigationTimeH / (1 - r.deficitFraction)),
        saved_m3: round(r.savedM3),
        saved_kwh: round(r.savedKwh),
        irrigated_pct: selectedParcel?.properties.irrigated_area_pct ?? '—',
        soil_moisture: selectedParcel?.properties.soil_moisture_m3m3 ?? '—',
      });
    }
  }

  return { role: opts.role, data, templateValues };
}

export function systemPrompt(ctx: CopilotContext): string {
  const audience =
    ctx.role === 'farmer'
      ? 'Hablas con un AGRICULTOR. Enfócate en la eficiencia del riego, la saturación del suelo y el ahorro de agua y energía de bombeo.'
      : 'Hablas con la COMUNIDAD o la JUNTA DE AGUA. Enfócate en la transparencia, la equidad en la cuenca y las alertas de esteros. No reveles datos privados de los sistemas de riego.';
  return [
    'Eres ChAgro Copilot, un asistente agrícola para la costa de Ecuador que usa datos satelitales de la NASA (radar SAR NISAR/Sentinel-1, NASA POWER) y estaciones comunitarias.',
    audience,
    'Reglas:',
    '- Usa SOLO los números del CONTEXTO. No inventes cifras ni hagas cálculos nuevos.',
    '- Responde en el idioma del usuario (por defecto español), en lenguaje sencillo, como un mensaje de WhatsApp: máximo 120 palabras, viñetas cortas y negritas para las cifras clave.',
    '- Si falta un dato, dilo y sugiere seleccionar una parcela o estación en el mapa.',
    '',
    `CONTEXTO (JSON): ${JSON.stringify(ctx.data)}`,
  ].join('\n');
}

export async function fallbackAnswer(ctx: CopilotContext, chipId?: string): Promise<string> {
  const fb = await getFallback();
  const group = ctx.role === 'farmer' ? { ...fb.community, ...fb.farmer } : fb.community;
  if (chipId && group[chipId]) return fillTemplate(group[chipId], ctx.templateValues);
  return `${fb.generic}\n\n${fillTemplate(fb.community.basin_summary, ctx.templateValues)}`;
}

const round = (v: number) => Number(v.toFixed(1));
