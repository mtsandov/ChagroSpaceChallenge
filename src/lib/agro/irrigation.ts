import type { Crop, IrrigationSystem, SoilType } from '../../types';
import type { DailyET0 } from './power';

/**
 * Lluvia efectiva (USDA simplificado, igual que en ShrimpDashboard › Irrigación Inteligente).
 */
export function effectiveRainfall(rainfall: number): number {
  if (rainfall <= 0) return 0;
  return rainfall < 75 ? rainfall * 0.8 : rainfall * 0.6 + 10;
}

export interface RecommendationInput {
  /** ET₀ diaria del período analizado (pasado) */
  history: DailyET0[];
  /** ET₀ pronosticada (próximos días), opcional */
  forecastEt0?: number[];
  kc: number;
  crop: Crop;
  soil: SoilType;
  system: IrrigationSystem;
  areaHa: number;
  /** Humedad de suelo observada (SAR / SMAP) [m³/m³]; si falta se asume a capacidad de campo menos RAW/2 */
  soilMoisture?: number;
  /** Reducción voluntaria del riego (riego deficitario), 0..1 */
  deficitFraction?: number;
}

export interface DailyRow {
  date: string;
  et0: number;
  etc: number;
  rainfall: number;
  effectiveRainfall: number;
}

export interface Recommendation {
  days: number;
  rows: DailyRow[];
  kc: number;
  et0Sum: number;
  etcSum: number;
  rainfallSum: number;
  effectiveRainfallSum: number;
  percolationSum: number;
  netMm: number;
  grossMm: number;
  volumeM3: number;
  volumePerPlantL: number | null;
  irrigationTimeH: number;
  energyKwh: number;
  // Balance de humedad en zona radicular (FAO-56 cap. 8)
  tawMm: number;
  rawMm: number;
  currentDepletionMm: number;
  daysUntilIrrigation: number;
  needsIrrigationNow: boolean;
  // Escenario deficitario
  deficitFraction: number;
  savedM3: number;
  savedKwh: number;
}

const PUMP_EFFICIENCY = 0.6;

/**
 * Recomendación de riego.
 *
 * 1) Como en ShrimpDashboard: lámina = Σ(ET₀·Kc) − Pef (+ percolación en arroz),
 *    dividida por la eficiencia del sistema.
 * 2) Volumen por área (inundación/surcos/aspersión) o por planta (goteo).
 * 3) Balance hídrico simplificado: con la humedad observada por SAR se estima
 *    el agotamiento actual Dr y en cuántos días se alcanza el umbral RAW.
 */
export function computeRecommendation(input: RecommendationInput): Recommendation {
  const { history, kc, crop, soil, system, areaHa } = input;
  const deficitFraction = Math.min(Math.max(input.deficitFraction ?? 0, 0), 0.9);

  const rows: DailyRow[] = history
    .filter((d): d is DailyET0 & { et0: number } => d.et0 !== null)
    .map((d) => ({
      date: d.date,
      et0: d.et0,
      etc: d.et0 * kc,
      rainfall: d.rainfall,
      effectiveRainfall: effectiveRainfall(d.rainfall),
    }));

  const days = rows.length;
  const et0Sum = sum(rows.map((r) => r.et0));
  const etcSum = et0Sum * kc;
  const rainfallSum = sum(rows.map((r) => r.rainfall));
  const effectiveRainfallSum = effectiveRainfall(rainfallSum);
  const percolationSum = (system.percolation_mm_day ?? 0) * days;

  const fullNetMm = Math.max(0, etcSum + percolationSum - effectiveRainfallSum);
  const efficiency = Math.max(system.efficiency, 1) / 100;
  const fullGrossMm = fullNetMm / efficiency;

  const full = volumes(fullGrossMm, system, areaHa);
  const netMm = fullNetMm * (1 - deficitFraction);
  const grossMm = fullGrossMm * (1 - deficitFraction);
  const applied = volumes(grossMm, system, areaHa);

  // --- Balance en zona radicular ---
  const tawMm = 1000 * (soil.theta_fc - soil.theta_wp) * crop.root_depth_m;
  const rawMm = crop.p_depletion * tawMm;
  const theta = input.soilMoisture;
  const currentDepletionMm =
    theta === undefined ? rawMm / 2 : clamp(1000 * (soil.theta_fc - theta) * crop.root_depth_m, 0, tawMm);

  const meanEtc = days > 0 ? etcSum / days : 0;
  const forecast = (input.forecastEt0 ?? []).map((e) => e * kc);
  let dr = currentDepletionMm;
  let daysUntilIrrigation = 0;
  while (dr < rawMm && daysUntilIrrigation < 60 && (meanEtc > 0 || forecast.length > 0)) {
    dr += forecast[daysUntilIrrigation] ?? meanEtc;
    daysUntilIrrigation++;
  }

  return {
    days,
    rows,
    kc,
    et0Sum,
    etcSum,
    rainfallSum,
    effectiveRainfallSum,
    percolationSum,
    netMm,
    grossMm,
    volumeM3: applied.volumeM3,
    volumePerPlantL: applied.volumePerPlantL,
    irrigationTimeH: applied.timeH,
    energyKwh: applied.energyKwh,
    tawMm,
    rawMm,
    currentDepletionMm,
    daysUntilIrrigation,
    needsIrrigationNow: currentDepletionMm >= rawMm,
    deficitFraction,
    savedM3: full.volumeM3 - applied.volumeM3,
    savedKwh: full.energyKwh - applied.energyKwh,
  };
}

function volumes(grossMm: number, system: IrrigationSystem, areaHa: number) {
  let volumeM3: number;
  let volumePerPlantL: number | null = null;
  let timeH = 0;

  if (system.mode === 'per_plant') {
    const r = system.canopy_radius_m ?? 0;
    const plantArea = Math.PI * r * r; // m²
    const perPlantM3 = (grossMm / 1000) * plantArea;
    volumePerPlantL = perPlantM3 * 1000;
    volumeM3 = perPlantM3 * (system.num_plants ?? 0);
    const flowPerPlant = (system.flow_rate_lph ?? 0) * (system.emitters ?? 0); // L/h
    timeH = flowPerPlant > 0 ? volumePerPlantL / flowPerPlant : 0;
  } else {
    volumeM3 = grossMm * areaHa * 10; // 1 mm sobre 1 ha = 10 m³
    timeH = system.system_flow_m3h ? volumeM3 / system.system_flow_m3h : 0;
  }

  let energyKwh = 0;
  if (system.pump_kw && timeH > 0) {
    energyKwh = system.pump_kw * timeH;
  } else if (system.pump_head_m) {
    energyKwh = (volumeM3 * system.pump_head_m) / (367 * PUMP_EFFICIENCY);
  }

  return { volumeM3, volumePerPlantL, timeH, energyKwh };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
