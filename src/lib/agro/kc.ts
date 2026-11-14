import type { Crop } from '../../types';

export interface StageInfo {
  stageIndex: number;
  stageName: string;
  kc: number;
  daysSincePlanting: number;
}

/**
 * Etapa y Kc del cultivo para una fecha, según los días desde la siembra.
 * Igual que en ShrimpDashboard, el Kc es constante dentro de cada etapa.
 * Pasado el ciclo completo se usa la última etapa.
 */
export function stageForDate(crop: Crop, plantingDate: string, date: string): StageInfo {
  const days = Math.max(0, Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${plantingDate}T00:00:00Z`)) / 86_400_000));
  let acc = 0;
  for (let i = 0; i < crop.stages.length; i++) {
    acc += crop.stages[i].duration_days;
    if (days < acc) {
      return { stageIndex: i, stageName: crop.stages[i].stage_name, kc: crop.stages[i].kc_value, daysSincePlanting: days };
    }
  }
  const last = crop.stages.length - 1;
  return { stageIndex: last, stageName: crop.stages[last].stage_name, kc: crop.stages[last].kc_value, daysSincePlanting: days };
}
