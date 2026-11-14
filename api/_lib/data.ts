/**
 * Acceso a datos del backend.
 *
 * Hoy lee los JSON SIMULADOS de /public/data. Cuando el pipeline NASA esté listo,
 * reemplazar estas funciones por consultas a Supabase o a NASA POWER sin cambiar
 * su firma (las consumen chat, weather y recommend).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  Basin,
  FarmerParcel,
  SarParcelCollection,
  VirtualStation,
  WeatherDataset,
} from '../../src/types';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const cache = new Map<string, unknown>();

async function load<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    cache.set(file, JSON.parse(await readFile(join(DATA_DIR, file), 'utf8')));
  }
  return cache.get(file) as T;
}

export const getBasins = () => load<Basin[]>('basins.json');
export const getParcels = () => load<SarParcelCollection>('sar_irrigation_anomalies.geojson');
export const getStations = () => load<VirtualStation[]>('virtual_stations.json');
export const getFallback = () => load<Record<string, any>>('fallback_copilot.json');

// TODO(nasa): reemplazar por NASA POWER daily point API
//   https://power.larc.nasa.gov/api/temporal/daily/point
//   ?parameters=T2M_MAX,T2M_MIN,T2MDEW,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PS,PRECTOTCORR
//   &community=AG&latitude=..&longitude=..&start=YYYYMMDD&end=YYYYMMDD&format=JSON
// + Open-Meteo para el pronóstico de 72 h. Mantener el formato `BasinWeather`.
export const getWeather = () => load<WeatherDataset>('weather_daily.json');

// TODO(supabase): reemplazar por `select * from parcels join irrigation_systems ... where owner_id = auth.uid()`
export async function getFarmerParcels(_userId: string): Promise<FarmerParcel[]> {
  return load<FarmerParcel[]>('farmer_demo.json');
}
