import type { PowerDaily } from '../../types';
import { calculateET0, dayOfYear } from './penmanMonteith';

export const POWER_FILL_VALUE = -999;

const valid = (v: number | undefined | null): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v !== POWER_FILL_VALUE;

export interface DailyET0 {
  date: string;
  et0: number | null;
  rainfall: number;
}

/**
 * Convierte registros diarios de NASA POWER a ET₀ diaria.
 * Días con valores faltantes (-999) devuelven et0 = null.
 */
export function et0FromPower(records: PowerDaily[], latitude: number, elevation: number): DailyET0[] {
  return records.map((r) => {
    const ok = [r.T2M_MAX, r.T2M_MIN, r.ALLSKY_SFC_SW_DWN, r.WS2M].every(valid) && (valid(r.T2MDEW) || valid(r.RH2M));
    const rainfall = valid(r.PRECTOTCORR) ? r.PRECTOTCORR : 0;
    if (!ok) return { date: r.date, et0: null, rainfall };
    const et0 = calculateET0({
      tmax: r.T2M_MAX,
      tmin: r.T2M_MIN,
      rs: r.ALLSKY_SFC_SW_DWN,
      u2: r.WS2M,
      latitude,
      dayOfYear: dayOfYear(r.date),
      elevation,
      pressureKPa: valid(r.PS) ? r.PS : undefined,
      tdew: valid(r.T2MDEW) ? r.T2MDEW : undefined,
      rhMean: valid(r.T2MDEW) ? undefined : r.RH2M,
    });
    return { date: r.date, et0, rainfall };
  });
}
