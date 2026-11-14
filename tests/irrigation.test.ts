import { describe, expect, it } from 'vitest';
import { computeRecommendation, effectiveRainfall } from '../src/lib/agro/irrigation';
import { stageForDate } from '../src/lib/agro/kc';
import { CROPS, SOIL_TYPES } from '../src/data/crops';

const rice = CROPS.find((c) => c.id === 'rice')!;
const banana = CROPS.find((c) => c.id === 'banana')!;
const clay = SOIL_TYPES.find((s) => s.id === 'clay')!;
const loam = SOIL_TYPES.find((s) => s.id === 'loam')!;

const week = Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-0${i + 1}`, et0: 4, rainfall: 0 }));

describe('lluvia efectiva', () => {
  it('sigue la regla USDA de ShrimpDashboard', () => {
    expect(effectiveRainfall(0)).toBe(0);
    expect(effectiveRainfall(50)).toBe(40);
    expect(effectiveRainfall(100)).toBe(70);
  });
});

describe('Kc por etapa', () => {
  it('elige la etapa según los días desde la siembra', () => {
    expect(stageForDate(rice, '2026-09-20', '2026-09-25').stageName).toBe('Inicial');
    expect(stageForDate(rice, '2026-09-20', '2026-11-14').stageName).toBe('Desarrollo');
    expect(stageForDate(rice, '2020-01-01', '2026-11-14').stageName).toBe('Final');
  });
});

describe('recomendación de riego', () => {
  it('modo por área: 1 mm sobre 1 ha = 10 m³', () => {
    const r = computeRecommendation({
      history: week,
      kc: 1,
      crop: rice,
      soil: clay,
      areaHa: 1,
      system: { type: 'flood', mode: 'per_area', efficiency: 100, system_flow_m3h: 28 },
    });
    expect(r.etcSum).toBeCloseTo(28);
    expect(r.grossMm).toBeCloseTo(28);
    expect(r.volumeM3).toBeCloseTo(280);
    expect(r.irrigationTimeH).toBeCloseTo(10);
  });

  it('suma la percolación y divide por la eficiencia', () => {
    const r = computeRecommendation({
      history: week,
      kc: 1,
      crop: rice,
      soil: clay,
      areaHa: 1,
      system: { type: 'flood', mode: 'per_area', efficiency: 50, percolation_mm_day: 2 },
    });
    expect(r.netMm).toBeCloseTo(42);
    expect(r.grossMm).toBeCloseTo(84);
  });

  it('modo por planta: igual que ShrimpDashboard (π·r² × lámina)', () => {
    const r = computeRecommendation({
      history: week,
      kc: 1,
      crop: banana,
      soil: loam,
      areaHa: 1,
      system: { type: 'drip', mode: 'per_plant', efficiency: 100, num_plants: 100, canopy_radius_m: 1, flow_rate_lph: 4, emitters: 2 },
    });
    const perPlantL = (28 / 1000) * Math.PI * 1000;
    expect(r.volumePerPlantL).toBeCloseTo(perPlantL);
    expect(r.volumeM3).toBeCloseTo((perPlantL * 100) / 1000);
    expect(r.irrigationTimeH).toBeCloseTo(perPlantL / 8);
  });

  it('el riego deficitario del 25% ahorra un cuarto del volumen', () => {
    const r = computeRecommendation({
      history: week,
      kc: 1,
      crop: rice,
      soil: clay,
      areaHa: 2,
      deficitFraction: 0.25,
      system: { type: 'flood', mode: 'per_area', efficiency: 100, pump_head_m: 10 },
    });
    expect(r.volumeM3).toBeCloseTo(420);
    expect(r.savedM3).toBeCloseTo(140);
    expect(r.savedKwh).toBeGreaterThan(0);
  });

  it('con suelo saturado (humedad SAR alta) no hace falta regar todavía', () => {
    const r = computeRecommendation({
      history: week,
      kc: 1,
      crop: banana,
      soil: loam,
      areaHa: 1,
      soilMoisture: 0.3,
      system: { type: 'drip', mode: 'per_plant', efficiency: 90, num_plants: 1, canopy_radius_m: 1 },
    });
    expect(r.currentDepletionMm).toBe(0);
    expect(r.needsIrrigationNow).toBe(false);
    expect(r.daysUntilIrrigation).toBeGreaterThan(0);
  });

  it('con suelo seco marca riego inmediato', () => {
    const r = computeRecommendation({
      history: week,
      kc: 1,
      crop: banana,
      soil: loam,
      areaHa: 1,
      soilMoisture: 0.13,
      system: { type: 'drip', mode: 'per_plant', efficiency: 90, num_plants: 1, canopy_radius_m: 1 },
    });
    expect(r.needsIrrigationNow).toBe(true);
    expect(r.daysUntilIrrigation).toBe(0);
  });
});
