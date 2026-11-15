import type { Crop, SoilType } from '../types';

/**
 * Catálogo de cultivos con Kc por etapa (FAO-56, tabla 12) y parámetros de raíz
 * (FAO-56, tabla 22).
 */
export const CROPS: Crop[] = [
  {
    id: 'rice',
    name: 'Arroz',
    root_depth_m: 0.5,
    p_depletion: 0.2,
    stages: [
      { stage_name: 'Inicial', kc_value: 1.05, duration_days: 30 },
      { stage_name: 'Desarrollo', kc_value: 1.12, duration_days: 30 },
      { stage_name: 'Media', kc_value: 1.2, duration_days: 60 },
      { stage_name: 'Final', kc_value: 0.9, duration_days: 30 },
    ],
  },
  {
    id: 'sugarcane',
    name: 'Caña de azúcar',
    root_depth_m: 1.2,
    p_depletion: 0.65,
    stages: [
      { stage_name: 'Inicial', kc_value: 0.4, duration_days: 35 },
      { stage_name: 'Desarrollo', kc_value: 0.82, duration_days: 60 },
      { stage_name: 'Media', kc_value: 1.25, duration_days: 190 },
      { stage_name: 'Final', kc_value: 0.75, duration_days: 120 },
    ],
  },
  {
    id: 'banana',
    name: 'Banano',
    root_depth_m: 0.6,
    p_depletion: 0.35,
    stages: [
      { stage_name: 'Inicial', kc_value: 0.5, duration_days: 120 },
      { stage_name: 'Desarrollo', kc_value: 0.8, duration_days: 90 },
      { stage_name: 'Media', kc_value: 1.1, duration_days: 120 },
      { stage_name: 'Final', kc_value: 1.0, duration_days: 60 },
    ],
  },
  {
    id: 'cacao',
    name: 'Cacao',
    root_depth_m: 0.8,
    p_depletion: 0.3,
    stages: [
      { stage_name: 'Inicial', kc_value: 1.0, duration_days: 365 },
      { stage_name: 'Media', kc_value: 1.05, duration_days: 365 },
      { stage_name: 'Final', kc_value: 1.05, duration_days: 365 },
    ],
  },
  {
    id: 'maize',
    name: 'Maíz',
    root_depth_m: 1.0,
    p_depletion: 0.55,
    stages: [
      { stage_name: 'Inicial', kc_value: 0.3, duration_days: 20 },
      { stage_name: 'Desarrollo', kc_value: 0.75, duration_days: 35 },
      { stage_name: 'Media', kc_value: 1.2, duration_days: 40 },
      { stage_name: 'Final', kc_value: 0.6, duration_days: 30 },
    ],
  },
  {
    id: 'mango',
    name: 'Mango',
    root_depth_m: 1.2,
    p_depletion: 0.5,
    stages: [
      { stage_name: 'Inicial', kc_value: 0.6, duration_days: 60 },
      { stage_name: 'Media', kc_value: 0.75, duration_days: 180 },
      { stage_name: 'Final', kc_value: 0.65, duration_days: 125 },
    ],
  },
];

/** Contenido de humedad (m³/m³) a capacidad de campo y punto de marchitez (FAO-56, tabla 19). */
export const SOIL_TYPES: SoilType[] = [
  { id: 'sand', name: 'Arenoso', theta_fc: 0.12, theta_wp: 0.04 },
  { id: 'loam', name: 'Franco', theta_fc: 0.27, theta_wp: 0.12 },
  { id: 'clay_loam', name: 'Franco arcilloso', theta_fc: 0.34, theta_wp: 0.2 },
  { id: 'clay', name: 'Arcilloso', theta_fc: 0.4, theta_wp: 0.25 },
];

export const findCrop = (id: string) => CROPS.find((c) => c.id === id);
export const findSoil = (id: string) => SOIL_TYPES.find((s) => s.id === id);
