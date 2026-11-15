import { useEffect, useState } from 'react';
import type { Basin, SarParcelCollection, VirtualStation, WaterMaskCollection, WeatherDataset } from '../../types';
import { loadData } from './client';

export interface ViewerData {
  basins: Basin[];
  parcels: SarParcelCollection;
  waterBaseline: WaterMaskCollection;
  waterCurrent: WaterMaskCollection;
  stations: VirtualStation[];
  weather: WeatherDataset;
}

/**
 * Carga los datos del visor desde /public/data (NASA reales + estaciones y agricultor demo simulados).
 * TODO(nasa/supabase): cambiar por consultas a Supabase sin cambiar la forma de `ViewerData`.
 */
export function useViewerData() {
  const [data, setData] = useState<ViewerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadData<Basin[]>('basins.json'),
      loadData<SarParcelCollection>('sar_irrigation_anomalies.geojson'),
      loadData<WaterMaskCollection>('sar_water_mask_baseline.geojson'),
      loadData<WaterMaskCollection>('sar_water_mask_current.geojson'),
      loadData<VirtualStation[]>('virtual_stations.json'),
      loadData<WeatherDataset>('weather_daily.json'),
    ])
      .then(([basins, parcels, waterBaseline, waterCurrent, stations, weather]) => {
        if (alive) setData({ basins, parcels, waterBaseline, waterCurrent, stations, weather });
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  return { data, error };
}
