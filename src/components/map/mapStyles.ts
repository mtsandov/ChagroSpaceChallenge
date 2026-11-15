import type { AlertLevel, ParcelStatus, ZoneType } from '../../types';

/** Colores centralizados del mapa: ajustar aquí para cambiar el look de las capas. */
export const STATUS_COLORS: Record<ParcelStatus, string> = {
  excessive: '#f97316', // naranja: exceso de agua (alerta de transparencia)
  normal: '#22c55e',
  deficit: '#eab308',
};

export const STATUS_LABELS: Record<ParcelStatus, string> = {
  excessive: 'Exceso de agua',
  normal: 'Riego normal',
  deficit: 'Déficit hídrico',
};

export const ZONE_COLORS: Record<ZoneType, string> = {
  commercial_farm: '#a855f7',
  smallholder: '#f59e0b',
  community: '#10b981',
};

export const ZONE_LABELS: Record<ZoneType, string> = {
  commercial_farm: 'Finca comercial',
  smallholder: 'Pequeño productor',
  community: 'Zona comunitaria',
};

export const ALERT_COLORS: Record<AlertLevel, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical_low: '#ef4444',
};

export const ALERT_LABELS: Record<AlertLevel, string> = {
  normal: 'Normal',
  warning: 'Alerta',
  critical_low: 'Crítico bajo',
};

export const WATER_STYLE = {
  baseline: { color: '#7dd3fc', fillColor: '#7dd3fc', fillOpacity: 0.55, weight: 1 },
  current: { color: '#0ea5e9', fillColor: '#22d3ee', fillOpacity: 0.7, weight: 1 },
};

export const TREND_LABELS = { increasing: '↑ subiendo', stable: '→ estable', decreasing: '↓ bajando' } as const;
