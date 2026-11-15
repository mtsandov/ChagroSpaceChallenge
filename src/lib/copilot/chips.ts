import type { Role } from '../../types';
import type { Lang } from '../../i18n';

export interface QuickChip {
  id: string;
  label: string;
  prompt: string;
  /** Requiere una parcela del agricultor seleccionada */
  needsFarmerParcel?: boolean;
}

export const QUICK_CHIPS: Record<Lang, Record<Role, QuickChip[]>> = {
  es: {
    public: [
      { id: 'transparency_report', label: 'Reporte de transparencia', prompt: 'Genera un reporte de transparencia hídrica para este sector.' },
      { id: 'basin_summary', label: 'Resumen de la cuenca', prompt: 'Dame un resumen del estado hídrico de la cuenca.' },
    ],
    farmer: [
      { id: 'pump_schedule', label: 'Horario de bombeo', prompt: 'Optimiza el horario de bombeo para esta parcela.', needsFarmerParcel: true },
      { id: 'savings_25', label: 'Ahorro si reduzco 25%', prompt: 'Calcula el ahorro de agua y energía si reduzco el riego un 25%.', needsFarmerParcel: true },
      { id: 'parcel_status', label: 'Estado de mi parcela', prompt: '¿Cómo está la humedad de mi parcela según el radar?', needsFarmerParcel: true },
    ],
  },
  en: {
    public: [
      { id: 'transparency_report', label: 'Transparency report', prompt: 'Generate a water transparency report for this area.' },
      { id: 'basin_summary', label: 'Basin summary', prompt: 'Give me a summary of the water status of the basin.' },
    ],
    farmer: [
      { id: 'pump_schedule', label: 'Pumping schedule', prompt: 'Optimize the pumping schedule for this parcel.', needsFarmerParcel: true },
      { id: 'savings_25', label: 'Savings if I cut 25%', prompt: 'Calculate the water and energy savings if I reduce irrigation by 25%.', needsFarmerParcel: true },
      { id: 'parcel_status', label: 'My parcel status', prompt: 'How is the soil moisture of my parcel according to the radar?', needsFarmerParcel: true },
    ],
  },
};

/** Reemplaza `{{clave}}` por valores del contexto. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in values ? String(values[k]) : '—'));
}
