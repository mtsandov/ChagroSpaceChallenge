import type { ZoneStatus } from '../../types';

/** Colores centralizados del mapa: ajustar aquí para cambiar el look de las capas. */
export const STATUS_COLORS: Record<ZoneStatus, string> = {
  excessive: '#f97316', // naranja: exceso de agua (alerta de transparencia)
  normal: '#22c55e',
  deficit: '#eab308',
  inconclusive: '#94a3b8',
};




export const VIGOR_STOPS: [number, string][] = [
  [0.4, '#b45309'],
  [0.5, '#eab308'],
  [0.6, '#84cc16'],
  [0.7, '#16a34a'],
  [0.8, '#14532d'],
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

export function vigorColor(ndvi: number | null | undefined): string {
  if (ndvi == null) return '#94a3b8';
  const v = Math.min(Math.max(ndvi, VIGOR_STOPS[0][0]), VIGOR_STOPS[VIGOR_STOPS.length - 1][0]);
  const i = Math.max(VIGOR_STOPS.findIndex(([x]) => x >= v), 1);
  const [x0, c0] = VIGOR_STOPS[i - 1];
  const [x1, c1] = VIGOR_STOPS[i];
  const t = (v - x0) / (x1 - x0);
  const [a, b] = [hex(c0), hex(c1)];
  return `rgb(${a.map((n, k) => Math.round(n + (b[k] - n) * t)).join(',')})`;
}

export const WATER_STYLE = { color: '#0ea5e9', fillColor: '#22d3ee', fillOpacity: 0.7, weight: 1 };


export const HV_STOPS = ['#7c4a1e', '#d6b45a', '#7cb342', '#2e7d32', '#0b3d17'];
