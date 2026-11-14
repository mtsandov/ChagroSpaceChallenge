import { getFarmerParcels, getParcels, getWeather } from './_lib/data';
import { resolveUser } from './_lib/auth';
import { methodNotAllowed, type ApiRequest, type ApiResponse } from './_lib/http';
import { recommendForParcel } from '../src/lib/summary';
import type { FarmerParcel } from '../src/types';

/**
 * POST /api/recommend  (solo rol agricultor)
 * body: { parcel_id: string, days?: number, deficit_pct?: number }
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const user = await resolveUser(req);
  if (user.role !== 'farmer' || !user.id) {
    return res.status(401).json({ error: 'Inicia sesión como agricultor para ver recomendaciones.' });
  }

  const { parcel_id, parcel: inlineParcel, days = 7, deficit_pct = 0 } = (req.body ?? {}) as {
    parcel_id?: string;
    /** Parcela enviada desde el cliente (modo demo, aún no guardada en BD). Solo usa datos del propio usuario. */
    parcel?: FarmerParcel;
    days?: number;
    deficit_pct?: number;
  };

  const parcels = await getFarmerParcels(user.id);
  const parcel = parcels.find((p) => p.id === parcel_id) ?? (isValidParcel(inlineParcel) ? inlineParcel : undefined);
  if (!parcel) return res.status(404).json({ error: 'Parcela no encontrada' });

  const weather = (await getWeather())[parcel.basin_id];
  if (!weather) return res.status(404).json({ error: 'Sin datos de clima para la cuenca' });

  // Humedad de suelo observada por SAR en la parcela SAR más cercana (mock)
  const sar = await getParcels();
  const nearest = sar.features
    .filter((f) => f.properties.basin_id === parcel.basin_id)
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates[0][0];
      return { f, d: Math.hypot(lat - parcel.center[0], lng - parcel.center[1]) };
    })
    .sort((a, b) => a.d - b.d)[0]?.f;

  const result = recommendForParcel(parcel, weather, {
    days: clamp(Number(days) || 7, 1, 30),
    deficitFraction: clamp(Number(deficit_pct) || 0, 0, 90) / 100,
    soilMoisture: nearest?.properties.soil_moisture_m3m3,
  });

  res.status(200).json(result);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function isValidParcel(p: unknown): p is FarmerParcel {
  const x = p as FarmerParcel | undefined;
  return (
    !!x &&
    typeof x.basin_id === 'string' &&
    typeof x.crop_id === 'string' &&
    typeof x.soil_type_id === 'string' &&
    typeof x.planting_date === 'string' &&
    Number.isFinite(x.area_ha) &&
    Array.isArray(x.center) &&
    !!x.irrigation &&
    Number.isFinite(x.irrigation.efficiency)
  );
}
