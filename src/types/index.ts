import type { Feature, FeatureCollection, Polygon } from 'geojson';

export type Role = 'public' | 'farmer';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

export interface Basin {
  id: string;
  name: string;
  short_name: string;
  center: [number, number];
  zoom: number;
  sustainable_quota_ha: number;
  description: string;
}

export type ParcelStatus = 'excessive' | 'normal' | 'deficit';
export type ZoneStatus = ParcelStatus | 'inconclusive';
export type ZoneType = 'commercial_farm' | 'smallholder' | 'community';

export interface SarParcelProps {
  parcel_id: string;
  name: string;
  basin_id: string;
  zone_type: ZoneType;
  crop: string;
  area_hectares: number;
  irrigated_area_pct: number;
  irrigated_area_ha: number;
  baseline_water_pct: number;
  sar_backscatter_db: number;
  sar_delta_db: number;
  soil_moisture_m3m3: number;
  ndvi: number;
  status: ParcelStatus;
  status_label: string;
  observation_date: string;
  baseline_date: string;
  sensor: string;
}

export type SarParcelFeature = Feature<Polygon, SarParcelProps>;
export type SarParcelCollection = FeatureCollection<Polygon, SarParcelProps>;
export interface TimelinePoint {
  date: string;
  water_pct: number | null;
  hv_db: number | null;
  ndvi: number | null;
  soil_moisture_m3m3: number | null;
  status: ZoneStatus;
}

export interface PassConditions {
  rain_7d_mm: number | null;
  rain_12d_mm: number | null;
  smap_m3m3: number | null;
  reliable: boolean;
  month_rain_mm: number;
  month_climatology_mm: number;
}

export type SarTimeline = Record<
  string,
  {
    dates: string[];
    reference_date: string;
    climatology_period: string;
    conditions: Record<string, PassConditions>;
    zones: Record<string, TimelinePoint[]>;
  }
>;

export type HvImages = Record<string, Record<string, { url: string; bounds: [[number, number], [number, number]] }>>;

export type WaterMaskCollection = FeatureCollection<Polygon, { basin_id: string; scene?: string; water_class?: string; date?: string }>;

/** Registro diario con los nombres de parámetro de NASA POWER (community=AG). */
export interface PowerDaily {
  date: string;
  T2M_MAX: number;
  T2M_MIN: number;
  T2MDEW: number;
  RH2M: number;
  WS2M: number;
  ALLSKY_SFC_SW_DWN: number; // MJ/m²/día
  PS: number; // kPa
  PRECTOTCORR: number; // mm/día
}

export interface ForecastDaily {
  date: string;
  temperature_2m_max: number;
  temperature_2m_min: number;
  precipitation_sum: number;
  precipitation_probability_max: number | null;
  et0_fao_evapotranspiration: number;
}

export interface BasinWeather {
  source: string;
  community: string;
  location: { lat: number; lng: number; elevation_m: number };
  daily: PowerDaily[];
  forecast: { source: string; daily: ForecastDaily[] };
}

export type WeatherDataset = Record<string, BasinWeather>;

export interface CropStage {
  stage_name: string;
  kc_value: number;
  duration_days: number;
}

export interface Crop {
  id: string;
  name: string;
  root_depth_m: number;
  p_depletion: number;
  stages: CropStage[];
}

export interface SoilType {
  id: string;
  name: string;
  theta_fc: number;
  theta_wp: number;
}

export type IrrigationType = 'drip' | 'sprinkler' | 'micro_sprinkler' | 'furrow' | 'flood' | 'subsurface' | 'other';

export interface IrrigationSystem {
  type: IrrigationType;
  mode: 'per_plant' | 'per_area';
  efficiency: number; // %
  // por planta
  num_plants?: number;
  canopy_radius_m?: number;
  flow_rate_lph?: number;
  emitters?: number;
  // por área
  system_flow_m3h?: number;
  percolation_mm_day?: number;
  // energía
  pump_kw?: number;
  pump_head_m?: number;
}

export interface FarmerParcel {
  id: string;
  name: string;
  basin_id: string;
  crop_id: string;
  planting_date: string;
  soil_type_id: string;
  area_ha: number;
  center: [number, number];
  polygon?: [number, number][];
  irrigation: IrrigationSystem;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'gemini' | 'fallback';
}

/** Lo que el mapa tiene seleccionado; se usa como contexto del copiloto. */
export type Selection =
  | { kind: 'parcel'; id: string }
  | null;
