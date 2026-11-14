import type { Role } from '../../types';

export interface QuickChip {
  id: string;
  label: string;
  prompt: string;
  /** Requiere una parcela del agricultor seleccionada */
  needsFarmerParcel?: boolean;
}

/** Chips rápidos por rol. Los ids coinciden con las llaves de /public/data/fallback_copilot.json */
export const QUICK_CHIPS: Record<Role, QuickChip[]> = {
  public: [
    {
      id: 'transparency_report',
      label: 'Reporte de transparencia',
      prompt: 'Genera un reporte de transparencia hídrica para este sector.',
    },
    {
      id: 'estero_dropping',
      label: '¿Por qué baja el estero?',
      prompt: '¿Por qué baja nuestro estero comunitario si llovió 0 mm?',
    },
    {
      id: 'basin_summary',
      label: 'Resumen de la cuenca',
      prompt: 'Dame un resumen del estado hídrico de la cuenca.',
    },
  ],
  farmer: [
    {
      id: 'pump_schedule',
      label: 'Horario de bombeo',
      prompt: 'Optimiza el horario de bombeo para esta parcela.',
      needsFarmerParcel: true,
    },
    {
      id: 'savings_25',
      label: 'Ahorro si reduzco 25%',
      prompt: 'Calcula el ahorro de agua y energía si reduzco el riego un 25%.',
      needsFarmerParcel: true,
    },
    {
      id: 'parcel_status',
      label: 'Estado de mi parcela',
      prompt: '¿Cómo está la humedad de mi parcela según el radar?',
      needsFarmerParcel: true,
    },
  ],
};

/** Reemplaza `{{clave}}` por valores del contexto. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in values ? String(values[k]) : '—'));
}
