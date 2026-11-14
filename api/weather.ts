import { getWeather } from './_lib/data';
import { methodNotAllowed, queryParam, type ApiRequest, type ApiResponse } from './_lib/http';
import { et0FromPower } from '../src/lib/agro/power';

/**
 * GET /api/weather?basin=daule
 * Clima diario (formato NASA POWER) + ET₀ Penman-Monteith calculada + pronóstico.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const basinId = queryParam(req, 'basin') ?? 'daule';
  const dataset = await getWeather();
  const weather = dataset[basinId];
  if (!weather) return res.status(404).json({ error: `Cuenca desconocida: ${basinId}` });

  const et0 = et0FromPower(weather.daily, weather.location.lat, weather.location.elevation_m);
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({ basin_id: basinId, ...weather, et0 });
}
