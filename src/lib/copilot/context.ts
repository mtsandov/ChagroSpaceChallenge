import type { Basin, FarmerParcel, PassConditions, Role, SarParcelCollection, SarTimeline, Selection, WeatherDataset } from '../../types';
import { summarizeBasin, recommendForParcel, type FarmerRecommendationResult } from '../summary';
import { fillTemplate } from './chips';

export interface CopilotContext {
  role: Role;
  data: Record<string, unknown>;
  templateValues: Record<string, string | number>;
}

export interface CopilotData {
  basins: Basin[];
  parcels: SarParcelCollection;
  weather: WeatherDataset;
  timeline: SarTimeline;
}

export type Fallbacks = { community: Record<string, string>; farmer: Record<string, string>; generic: string };

export function buildContext(
  source: CopilotData,
  opts: { role: Role; basinId: string; selection: Selection; farmerParcel?: FarmerParcel | null; date?: string | null },
): CopilotContext {
  const { basins, parcels, weather: weatherAll, timeline: timelineAll } = source;
  const basin = basins.find((b) => b.id === opts.basinId) ?? basins[0];
  const weather = weatherAll[basin.id];
  const summary = summarizeBasin(basin, weather, parcels);

  const selectedParcel =
    opts.selection?.kind === 'parcel' ? parcels.features.find((f) => f.properties.parcel_id === opts.selection!.id) : undefined;

  const own = parcels.features.filter((f) => f.properties.basin_id === basin.id);
  const analysisDate = own[0]?.properties.observation_date;
  const tl = timelineAll[basin.id];
  const passDate = opts.date && tl?.dates.includes(opts.date) ? opts.date : analysisDate;
  const cond = passDate ? tl?.conditions[passDate] : undefined;
  const passZones = own.map((f) => {
    const pt = tl?.zones[f.properties.parcel_id]?.find((x) => x.date === passDate);
    return {
      name: f.properties.name,
      status: pt?.status ?? f.properties.status,
      water_pct: pt?.water_pct ?? f.properties.irrigated_area_pct,
      ndvi: pt?.ndvi ?? f.properties.ndvi,
      hv_db: pt?.hv_db ?? null,
      nisar_sme2_soil_moisture_m3m3: pt?.soil_moisture_m3m3 ?? f.properties.soil_moisture_m3m3,
    };
  });
  const byStatus = (st: string) => passZones.filter((z) => z.status === st).map((z) => z.name);

  const data: Record<string, unknown> = {
    basin: { name: basin.name, sustainable_quota_ha: basin.sustainable_quota_ha },
    nasa_power: { rain_last_15_days_mm: summary.rain15, et0_avg_last_7_days_mm: summary.et0Avg7 },
    selected_pass: {
      date: passDate,
      is_official_analysis_date: passDate === analysisDate,
      reference_date: tl?.reference_date ?? own[0]?.properties.baseline_date,
      radar_reliable: cond?.reliable ?? true,
      rain_last_7_days_mm: cond?.rain_7d_mm ?? null,
      rain_last_12_days_mm: cond?.rain_12d_mm ?? null,
      smap_soil_moisture_m3m3: cond?.smap_m3m3 ?? null,
      month_rain_mm: cond?.month_rain_mm ?? null,
      month_rain_historical_avg_mm: cond?.month_climatology_mm ?? null,
      zones: passZones,
    },
    sar_official_analysis: {
      date: analysisDate,
      irrigated_area_ha: summary.irrigatedHa,
      above_quota_pct: summary.quotaPct,
      parcels_with_excess_water: summary.excessive,
      parcels_with_deficit: summary.deficit,
    },
    forecast_72h: weather.forecast.daily,
    selected_parcel: selectedParcel
      ? { ...selectedParcel.properties, on_selected_pass: passZones.find((z) => z.name === selectedParcel.properties.name) }
      : null,
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
    pass_note: passNote(passDate, analysisDate, cond, byStatus),
  };

  if (opts.role === 'farmer') {
    const parcel = opts.farmerParcel;
    if (parcel && weatherAll[parcel.basin_id]) {
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

function passNote(
  date: string | undefined,
  analysisDate: string | undefined,
  cond: PassConditions | undefined,
  byStatus: (s: string) => string[],
): string {
  if (!date || date === analysisDate) return '';
  const d = new Date(`${date}T12:00:00`).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' });
  if (cond && !cond.reliable) {
    return `📅 **Pase del ${d}: radar no concluyente.** Llovieron ${cond.rain_7d_mm} mm en 7 días y el suelo está casi saturado (SMAP ${cond.smap_m3m3}). Con el suelo encharcado tanto tiempo hay **riesgo de hongos** y pudrición de raíz: revisa drenajes y evita regar.\n\n`;
  }
  const exc = byStatus('excessive');
  const def = byStatus('deficit');
  const parts = [`📅 **Pase del ${d}:**`];
  parts.push(exc.length ? `exceso de agua en ${exc.join(', ')} (riesgo de hongos y lavado de fertilizante).` : 'sin zonas con exceso de agua.');
  if (def.length) parts.push(`Déficit en ${def.join(', ')}.`);
  return `${parts.join(' ')}\n\n`;
}

export function systemPrompt(ctx: CopilotContext): string {
  const audience =
    ctx.role === 'farmer'
      ? 'Hablas con un AGRICULTOR. Enfócate en la eficiencia del riego, la saturación del suelo y el ahorro de agua y energía de bombeo.'
      : 'Hablas con la COMUNIDAD o la JUNTA DE AGUA. Enfócate en la transparencia, la equidad en la cuenca y el uso del agua en la cuenca. No reveles datos privados de los sistemas de riego.';
  return [
    'Eres ChAgro Copilot, un asistente agrícola para la costa de Ecuador que usa datos satelitales de la NASA (radar SAR NISAR/Sentinel-1, NASA POWER).',
    audience,
    'Reglas:',
    '- Usa SOLO los números del CONTEXTO. No inventes cifras ni hagas cálculos nuevos.',
    '- Responde en el idioma del usuario (por defecto español), en lenguaje sencillo, como un mensaje de WhatsApp: máximo 120 palabras, viñetas cortas y negritas para las cifras clave.',
    '- Si falta un dato, dilo y sugiere seleccionar una zona en el mapa.',
    '- FECHA: el usuario eligió en el mapa la pasada `selected_pass.date`. Responde sobre ESA fecha y menciónala. `sar_official_analysis` es el reporte oficial (1 sep vs 15 jul); úsalo solo si preguntan por el estado oficial o la cuota.',
    '- Si `selected_pass.radar_reliable` es false, di que el radar no detecta bien el agua esa fecha (lluvia fuerte y cultivo tupido) y básate en la lluvia y en SMAP.',
    '- Riesgos agronómicos que debes explicar según el estado de la fecha:',
    '  · Exceso de agua (o suelo saturado por lluvia): riesgo de hongos (en arroz: pudrición de la vaina/Rhizoctonia, piricularia; en banano: sigatoka y pudrición de raíz), asfixia de raíces y lavado de nitrógeno. Recomienda drenar, no regar y monitorear manchas en hojas.',
    '  · Déficit: estrés hídrico; más grave en floración y llenado de grano. Recomienda riego en la madrugada.',
    '  · Normal: mantener turnos y vigilar el pronóstico.',
    '- Verdor (ndvi) y cultivo (hv_db, más alto = más vegetación) indican cómo creció la planta entre fechas.',
    '',
    `CONTEXTO (JSON): ${JSON.stringify(ctx.data)}`,
  ].join('\n');
}

export function fallbackAnswer(ctx: CopilotContext, fb: Fallbacks, chipId?: string): string {
  const group = ctx.role === 'farmer' ? { ...fb.community, ...fb.farmer } : fb.community;
  const note = String(ctx.templateValues.pass_note ?? '');
  if (chipId && group[chipId]) return note + fillTemplate(group[chipId], ctx.templateValues);
  return `${fb.generic}\n\n${note}${fillTemplate(fb.community.basin_summary, ctx.templateValues)}`;
}

const round = (v: number) => Number(v.toFixed(1));
