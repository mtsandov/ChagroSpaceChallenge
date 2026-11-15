import { CloudRain } from 'lucide-react';
import type { PassConditions, SarParcelProps, TimelinePoint } from '../../types';
import { STATUS_COLORS } from './mapStyles';
import ZoneTimeline from './ZoneTimeline';
import { useI18n } from '../../i18n';

const L = {
  es: {
    pass: 'pase',
    area: 'Área',
    water: 'Con agua (SAR)',
    ndvi: 'Verdor (NDVI)',
    hv: 'Cultivo (HV)',
    soil: 'Humedad suelo',
    rain12: 'Lluvia 12 días',
    backscatter: 'Retrodispersión',
    delta: 'Δ vs base',
    vs: 'vs',
    rainyA: 'Lluvia fuerte:',
    rainyB: 'en 7 días y suelo casi saturado (SMAP',
    rainyC: '). Bajo el cultivo tupido el radar no ve bien el agua.',
    monthA: 'En {{month}} llovieron',
    monthB: ', unas',
    monthC: 'veces',
    monthD: 'el promedio',
  },
  en: {
    pass: 'pass',
    area: 'Area',
    water: 'With water (SAR)',
    ndvi: 'Greenness (NDVI)',
    hv: 'Crop (HV)',
    soil: 'Soil moisture',
    rain12: 'Rain, 12 days',
    backscatter: 'Backscatter',
    delta: 'Δ vs baseline',
    vs: 'vs',
    rainyA: 'Heavy rain:',
    rainyB: 'in 7 days and nearly saturated soil (SMAP',
    rainyC: '). Under a dense crop the radar cannot see the water well.',
    monthA: 'In {{month}} it rained',
    monthB: ', about',
    monthC: 'times',
    monthD: 'the average',
  },
};

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
  const { lang, t, tx, zone, date: fmtDate, locale } = useI18n();
  const s = L[lang];
  const subtitle = `${tx(`zoneType.${p.zone_type}`)} · ${tx(`crop.${p.crop}`, p.crop)}`;

  if (!point || !date) {
    return (
      <div className="min-w-[230px]">
        <div className="text-sm font-semibold">{zone(p.name)}</div>
        <div className="mb-2 text-[11px] text-slate-500">{subtitle}</div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          <dt className="text-slate-500">{s.area}</dt>
          <dd className="text-right font-medium">{p.area_hectares} ha</dd>
          <dt className="text-slate-500">{s.water}</dt>
          <dd className="text-right font-medium">
            {p.irrigated_area_ha} ha ({p.irrigated_area_pct}%)
          </dd>
          <dt className="text-slate-500">{s.backscatter}</dt>
          <dd className="text-right font-medium">{p.sar_backscatter_db} dB</dd>
          <dt className="text-slate-500">{s.delta}</dt>
          <dd className="text-right font-medium">{p.sar_delta_db} dB</dd>
          <dt className="text-slate-500">{s.soil}</dt>
          <dd className="text-right font-medium">{p.soil_moisture_m3m3} m³/m³</dd>
          <dt className="text-slate-500">NDVI</dt>
          <dd className="text-right font-medium">{p.ndvi}</dd>
        </dl>
        <div
          className="mt-2 rounded px-2 py-1 text-center text-[11px] font-semibold text-white"
          style={{ background: STATUS_COLORS[p.status] }}
        >
          {t(`status.long.${p.status}`)}
        </div>
        <ZoneTimeline points={points} />
      </div>
    );
  }

  const official = date === p.observation_date;
  const waterHa = point.water_pct == null ? null : Math.round((p.area_hectares * point.water_pct) / 10) / 10;
  const factor = conditions && conditions.month_climatology_mm > 0 ? Math.round(conditions.month_rain_mm / conditions.month_climatology_mm) : null;
  const period = climatologyPeriod?.match(/\d{4}.*\d{4}/)?.[0].replace(/[A-Za-z]+ /g, '').replace(' - ', '–');
  const monthName = new Date(`${date}T12:00:00`).toLocaleDateString(locale, { month: 'long' });
  const statusText =
    official && point.status !== 'inconclusive' ? t(`status.long.${point.status}`) : t(`status.${point.status}`);

  return (
    <div className="min-w-[240px]">
      <div className="text-sm font-semibold">{zone(p.name)}</div>
      <div className="mb-2 text-[11px] text-slate-500">
        {subtitle} · {s.pass} {fmtDate(date, true)}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-slate-500">{s.area}</dt>
        <dd className="text-right font-medium">{p.area_hectares} ha</dd>
        <dt className="text-slate-500">{s.water}</dt>
        <dd className="text-right font-medium">{waterHa == null ? '—' : `${waterHa} ha (${point.water_pct}%)`}</dd>
        <dt className="text-slate-500">{s.ndvi}</dt>
        <dd className="text-right font-medium">{fmt(point.ndvi)}</dd>
        <dt className="text-slate-500">{s.hv}</dt>
        <dd className="text-right font-medium">{fmt(point.hv_db, ' dB')}</dd>
        <dt className="text-slate-500">{s.soil}</dt>
        <dd className="text-right font-medium">{fmt(point.soil_moisture_m3m3, ' m³/m³')}</dd>
        <dt className="text-slate-500">{s.rain12}</dt>
        <dd className="text-right font-medium">{fmt(conditions?.rain_12d_mm, ' mm')}</dd>
      </dl>
      <div
        className="mt-2 rounded px-2 py-1 text-center text-[11px] font-semibold text-white"
        style={{ background: STATUS_COLORS[point.status] }}
      >
        {statusText}
        {point.status !== 'inconclusive' && referenceDate && date !== referenceDate && (
          <span className="font-normal opacity-90">
            {' '}
            · {s.vs} {fmtDate(referenceDate)}
          </span>
        )}
      </div>
      {conditions && !conditions.reliable && (
        <div className="mt-2 flex gap-1.5 rounded bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
          <CloudRain size={14} className="mt-0.5 shrink-0" />
          <span>
            {s.rainyA} <strong>{fmt(conditions.rain_7d_mm, ' mm')}</strong> {s.rainyB} {fmt(conditions.smap_m3m3)}
            {s.rainyC}
            {factor != null && factor > 1 && (
              <>
                {' '}
                {s.monthA.replace('{{month}}', monthName)} <strong>{Math.round(conditions.month_rain_mm)} mm</strong>
                {s.monthB} <strong>{factor} {s.monthC}</strong> {s.monthD}
                {period ? ` (${period})` : ''}.
              </>
            )}
          </span>
        </div>
      )}
      <ZoneTimeline points={points} selected={date} />
    </div>
  );
}
