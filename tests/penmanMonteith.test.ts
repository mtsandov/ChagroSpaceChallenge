import { describe, expect, it } from 'vitest';
import {
  calculateET0Details,
  dayOfYear,
  extraterrestrialRadiation,
  pressureFromElevation,
} from '../src/lib/agro/penmanMonteith';
import { et0FromPower } from '../src/lib/agro/power';

describe('Penman-Monteith FAO-56', () => {
  it('reproduce el Ejemplo 18 de FAO-56 (Bruselas, 6 de julio)', () => {
    // Lat 50°48'N, z = 100 m, Tmax 21.5, Tmin 12.3, HRmax 84, HRmin 63,
    // u2 = 2.078 m/s, Rs = 22.07 MJ/m²/día → ET0 = 3.9 mm/día
    const d = calculateET0Details({
      tmax: 21.5,
      tmin: 12.3,
      rhMax: 84,
      rhMin: 63,
      u2: 2.078,
      rs: 22.07,
      latitude: 50.8,
      dayOfYear: 187,
      elevation: 100,
    });
    expect(d.ea).toBeCloseTo(1.409, 2);
    expect(d.ra).toBeCloseTo(41.09, 1);
    expect(d.rso).toBeCloseTo(30.9, 1);
    expect(d.rnl).toBeCloseTo(3.71, 1);
    expect(d.rn).toBeCloseTo(13.28, 1);
    expect(d.et0).toBeCloseTo(3.9, 1);
  });

  it('calcula Ra en el hemisferio sur (Ejemplo 8: 20°S, 3 de septiembre)', () => {
    expect(extraterrestrialRadiation(-20, 246)).toBeCloseTo(32.2, 1);
  });

  it('estima la presión a partir de la elevación (Ejemplo 2: 1800 m)', () => {
    expect(pressureFromElevation(1800)).toBeCloseTo(81.8, 1);
  });

  it('calcula el día del año', () => {
    expect(dayOfYear('2026-01-01')).toBe(1);
    expect(dayOfYear('2026-11-14')).toBe(318);
  });
});

describe('Entrada NASA POWER', () => {
  const base = {
    date: '2026-11-10',
    T2M_MAX: 31.5,
    T2M_MIN: 22.3,
    T2MDEW: 20.1,
    RH2M: 72,
    WS2M: 2.3,
    ALLSKY_SFC_SW_DWN: 17.2,
    PS: 101.05,
    PRECTOTCORR: 0,
  };

  it('da una ET₀ razonable para Daule en época seca (3.5–5 mm/día)', () => {
    const [r] = et0FromPower([base], -1.865, 12);
    expect(r.et0).not.toBeNull();
    expect(r.et0!).toBeGreaterThan(3.5);
    expect(r.et0!).toBeLessThan(5);
  });

  it('trata -999 como dato faltante', () => {
    const [r] = et0FromPower([{ ...base, ALLSKY_SFC_SW_DWN: -999, PRECTOTCORR: -999 }], -1.865, 12);
    expect(r.et0).toBeNull();
    expect(r.rainfall).toBe(0);
  });
});
