import { CloudRain } from 'lucide-react';
import type { PassConditions, SarParcelProps, TimelinePoint } from '../../types';
import { STATUS_COLORS, STATUS_LABELS, ZONE_LABELS } from './mapStyles';
import { shortDate } from './TimeSlider';
import ZoneTimeline from './ZoneTimeline';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

interface Props {
  p: SarParcelProps;
  date?: string;
  point?: TimelinePoint;
  points: TimelinePoint[];
  conditions?: PassConditions;
  referenceDate?: string;
  climatologyPeriod?: string;
}

const fmt = (v: number | null | undefined, unit = '') => (v == null ? '—' : `${v}${unit}`);

export default function ZonePopup({ p, date, point, points, conditions, referenceDate, climatologyPeriod }: Props) {
  if (!point || !date) return <GeneralPopup p={p} points={points} />;
  const official = date === p.observation_date;
  const waterHa = point.water_pct == null ? null : Math.round((p.area_hectares * point.water_pct) / 10) / 10;
  const factor = conditions && conditions.month_climatology_mm > 0 ? Math.round(conditions.month_rain_mm / conditions.month_climatology_mm) : null;
  const period = climatologyPeriod?.match(/\d{4}.*\d{4}/)?.[0].replace(/[A-Za-z]+ /g, '').replace(' - ', '–');

  return (
    <div className="min-w-[240px]">
      <div className="text-sm font-semibold">{p.name}</div>
      <div className="mb-2 text-[11px] text-slate-500">
        {ZONE_LABELS[p.zone_type]} · {p.crop} · pase {shortDate(date)} {date.slice(0, 4)}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-slate-500">Área</dt>
        <dd className="text-right font-medium">{p.area_hectares} ha</dd>
        <dt className="text-slate-500">Con agua (SAR)</dt>
        <dd className="text-right font-medium">
          {waterHa == null ? '—' : `${waterHa} ha (${point.water_pct}%)`}
        </dd>
        <dt className="text-slate-500">Verdor (NDVI)</dt>
        <dd className="text-right font-medium">{fmt(point.ndvi)}</dd>
        <dt className="text-slate-500">Cultivo (HV)</dt>
        <dd className="text-right font-medium">{fmt(point.hv_db, ' dB')}</dd>
        <dt className="text-slate-500">Humedad suelo</dt>
        <dd className="text-right font-medium">{fmt(point.soil_moisture_m3m3, ' m³/m³')}</dd>
        <dt className="text-slate-500">Lluvia 12 días</dt>
        <dd className="text-right font-medium">{fmt(conditions?.rain_12d_mm, ' mm')}</dd>
      </dl>
      <div
        className="mt-2 rounded px-2 py-1 text-center text-[11px] font-semibold text-white"
        style={{ background: STATUS_COLORS[point.status] }}
      >
        {official ? p.status_label : STATUS_LABELS[point.status]}
        {point.status !== 'inconclusive' && referenceDate && date !== referenceDate && (
          <span className="font-normal opacity-90"> · vs {shortDate(referenceDate)}</span>
        )}
      </div>
      {conditions && !conditions.reliable && (
        <div className="mt-2 flex gap-1.5 rounded bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
          <CloudRain size={14} className="mt-0.5 shrink-0" />
          <span>
            Lluvia fuerte: <strong>{fmt(conditions.rain_7d_mm, ' mm')}</strong> en 7 días y suelo casi saturado (SMAP{' '}
            {fmt(conditions.smap_m3m3)}). Bajo el cultivo tupido el radar no ve bien el agua.
            {factor != null && factor > 1 && (
              <>
                {' '}
                En {MONTHS[+date.slice(5, 7) - 1]} llovieron <strong>{Math.round(conditions.month_rain_mm)} mm</strong>, unas{' '}
                <strong>{factor} veces</strong> el promedio{period ? ` (${period})` : ''}.
              </>
            )}
          </span>
        </div>
      )}
      <ZoneTimeline points={points} selected={date} />
    </div>
  );
}

function GeneralPopup({ p, points }: { p: SarParcelProps; points: TimelinePoint[] }) {
  return (
    <div className="min-w-[230px]">
      <div className="text-sm font-semibold">{p.name}</div>
      <div className="mb-2 text-[11px] text-slate-500">
        {ZONE_LABELS[p.zone_type]} · {p.crop}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-slate-500">Área</dt>
        <dd className="text-right font-medium">{p.area_hectares} ha</dd>
        <dt className="text-slate-500">Con agua (SAR)</dt>
        <dd className="text-right font-medium">
          {p.irrigated_area_ha} ha ({p.irrigated_area_pct}%)
        </dd>
        <dt className="text-slate-500">Retrodispersión</dt>
        <dd className="text-right font-medium">{p.sar_backscatter_db} dB</dd>
        <dt className="text-slate-500">Δ vs base</dt>
        <dd className="text-right font-medium">{p.sar_delta_db} dB</dd>
        <dt className="text-slate-500">Humedad suelo</dt>
        <dd className="text-right font-medium">{p.soil_moisture_m3m3} m³/m³</dd>
        <dt className="text-slate-500">NDVI</dt>
        <dd className="text-right font-medium">{p.ndvi}</dd>
      </dl>
      <div
        className="mt-2 rounded px-2 py-1 text-center text-[11px] font-semibold text-white"
        style={{ background: STATUS_COLORS[p.status] }}
      >
        {p.status_label}
      </div>
      <ZoneTimeline points={points} />
    </div>
  );
}
