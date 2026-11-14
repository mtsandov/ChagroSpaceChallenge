/**
 * Evapotranspiración de referencia ET₀ — Penman-Monteith FAO-56 (diario).
 *
 * Port de `bio_dynamics_api/util/PenmanMonteith.js` (versión completa:
 * Rn = Rns − Rnl), adaptado a las variables de NASA POWER:
 *  - Rs  ← ALLSKY_SFC_SW_DWN  [MJ/m²/día]  (community=AG)
 *  - ea  ← T2MDEW (ec. 14), preferido porque POWER no entrega HRmax/HRmin
 *  - u₂  ← WS2M               [m/s] (ya a 2 m)
 *  - P   ← PS                 [kPa]  ⚠️ POWER ya entrega kPa, no hPa
 *
 * Referencia: Allen et al. (1998), FAO Irrigation and Drainage Paper 56.
 */

export interface ET0Input {
  tmax: number; // °C
  tmin: number; // °C
  rs: number; // radiación solar incidente [MJ/m²/día]
  u2: number; // viento a 2 m [m/s]
  latitude: number; // grados decimales (negativo = sur)
  dayOfYear: number; // 1..366
  elevation?: number; // m s.n.m.
  pressureKPa?: number; // presión atmosférica [kPa]
  /** Una de las tres formas de humedad (en orden de preferencia) */
  tdew?: number; // °C
  rhMax?: number; // %
  rhMin?: number; // %
  rhMean?: number; // %
  /** Presión de vapor real ya calculada [kPa] (tiene prioridad) */
  ea?: number;
}

export interface ET0Details {
  et0: number;
  tmean: number;
  es: number;
  ea: number;
  vpd: number;
  delta: number;
  gamma: number;
  pressure: number;
  ra: number;
  rso: number;
  rns: number;
  rnl: number;
  rn: number;
}

const GSC = 0.082; // constante solar [MJ m⁻² min⁻¹]
const SIGMA = 4.903e-9; // Stefan-Boltzmann [MJ K⁻⁴ m⁻² día⁻¹]
const ALBEDO = 0.23; // cultivo de referencia

/** Presión de vapor de saturación e°(T) [kPa] — ec. 11 */
export const saturationVaporPressure = (t: number) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3));

/** Pendiente de la curva de presión de vapor Δ [kPa/°C] — ec. 13 */
export const slopeVaporPressure = (t: number) => (4098 * saturationVaporPressure(t)) / Math.pow(t + 237.3, 2);

/** Presión atmosférica estimada a partir de la elevación [kPa] — ec. 7 */
export const pressureFromElevation = (z: number) => 101.3 * Math.pow((293 - 0.0065 * z) / 293, 5.26);

/** Radiación extraterrestre Ra [MJ/m²/día] — ec. 21 */
export function extraterrestrialRadiation(latitudeDeg: number, dayOfYear: number): number {
  const phi = (latitudeDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  const decl = 0.409 * Math.sin((2 * Math.PI * dayOfYear) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl))));
  return (
    ((24 * 60) / Math.PI) *
    GSC *
    dr *
    (ws * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(ws))
  );
}

/** Presión de vapor real ea [kPa] según la humedad disponible. */
export function actualVaporPressure(input: ET0Input): number {
  if (input.ea !== undefined) return input.ea;
  if (input.tdew !== undefined) return saturationVaporPressure(input.tdew); // ec. 14
  const eTmax = saturationVaporPressure(input.tmax);
  const eTmin = saturationVaporPressure(input.tmin);
  if (input.rhMax !== undefined && input.rhMin !== undefined) {
    return (eTmin * (input.rhMax / 100) + eTmax * (input.rhMin / 100)) / 2; // ec. 17
  }
  if (input.rhMean !== undefined) {
    return (input.rhMean / 100) * ((eTmax + eTmin) / 2); // ec. 19
  }
  throw new Error('ET0: se requiere tdew, rhMax/rhMin, rhMean o ea');
}

export function calculateET0Details(input: ET0Input): ET0Details {
  const { tmax, tmin, rs, u2, latitude, dayOfYear } = input;
  const elevation = input.elevation ?? 0;
  const pressure = input.pressureKPa ?? pressureFromElevation(elevation);

  const tmean = (tmax + tmin) / 2;
  const es = (saturationVaporPressure(tmax) + saturationVaporPressure(tmin)) / 2;
  const ea = actualVaporPressure(input);
  const vpd = Math.max(0, es - ea);
  const delta = slopeVaporPressure(tmean);
  const gamma = 0.000665 * pressure; // ec. 8

  const ra = extraterrestrialRadiation(latitude, dayOfYear);
  const rso = (0.75 + 2e-5 * elevation) * ra; // ec. 37
  const rns = (1 - ALBEDO) * rs; // ec. 38
  const rsRso = rso > 0 ? Math.min(rs / rso, 1) : 0;
  const tmaxK4 = Math.pow(tmax + 273.16, 4);
  const tminK4 = Math.pow(tmin + 273.16, 4);
  const rnl = SIGMA * ((tmaxK4 + tminK4) / 2) * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * rsRso - 0.35); // ec. 39
  const rn = rns - rnl; // ec. 40
  const g = 0; // flujo de calor del suelo ≈ 0 en escala diaria

  const et0 =
    (0.408 * delta * (rn - g) + gamma * (900 / (tmean + 273)) * u2 * vpd) / (delta + gamma * (1 + 0.34 * u2)); // ec. 6

  return { et0: Math.max(0, et0), tmean, es, ea, vpd, delta, gamma, pressure, ra, rso, rns, rnl, rn };
}

export const calculateET0 = (input: ET0Input) => calculateET0Details(input).et0;

/** Día del año (1..366) de una fecha ISO `YYYY-MM-DD`. */
export function dayOfYear(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}
