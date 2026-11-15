import { useEffect, useState } from 'react';
import type { Basin, HvImages, SarParcelCollection, SarTimeline, WaterMaskCollection, WeatherDataset } from '../../types';
import { loadData } from './client';

export interface ViewerData {
  basins: Basin[];
  parcels: SarParcelCollection;
  waterBaseline: WaterMaskCollection;
  waterCurrent: WaterMaskCollection;
  weather: WeatherDataset;
  timeline: SarTimeline;
  waterTimeline: WaterMaskCollection;
  hvImages: HvImages;
}

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
      loadData<WeatherDataset>('weather_daily.json'),
      loadData<SarTimeline>('sar_timeline.json').catch(() => ({})),
      loadData<WaterMaskCollection>('sar_water_timeline.geojson').catch(() => ({ type: 'FeatureCollection' as const, features: [] })),
      loadData<HvImages>('hv_images.json').catch(() => ({})),
    ])
      .then(([basins, parcels, waterBaseline, waterCurrent, weather, timeline, waterTimeline, hvImages]) => {
        if (alive) setData({ basins, parcels, waterBaseline, waterCurrent, weather, timeline, waterTimeline, hvImages });
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  return { data, error };
}
