import { ALERT_COLORS, ALERT_LABELS, STATUS_COLORS, STATUS_LABELS, WATER_STYLE, ZONE_COLORS, ZONE_LABELS } from './mapStyles';

export default function MapLegend({ colorBy }: { colorBy: 'status' | 'zone' }) {
  const parcelItems =
    colorBy === 'status'
      ? (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((k) => [STATUS_LABELS[k], STATUS_COLORS[k]])
      : (Object.keys(ZONE_COLORS) as (keyof typeof ZONE_COLORS)[]).map((k) => [ZONE_LABELS[k], ZONE_COLORS[k]]);

  return (
    <div className="card absolute bottom-6 left-3 z-[500] hidden space-y-2 p-3 text-[11px] sm:block">
      <div>
        <div className="mb-1 font-semibold text-slate-600">Parcelas</div>
        {parcelItems.map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: color, background: `${color}33` }} />
            {label}
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 font-semibold text-slate-600">Agua SAR</div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: WATER_STYLE.current.fillColor }} /> Pase actual
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: WATER_STYLE.baseline.fillColor }} /> Base seca
        </div>
      </div>
      <div>
        <div className="mb-1 font-semibold text-slate-600">Estaciones</div>
        {(Object.keys(ALERT_COLORS) as (keyof typeof ALERT_COLORS)[]).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-white" style={{ background: ALERT_COLORS[k] }} />
            {ALERT_LABELS[k]}
          </div>
        ))}
      </div>
    </div>
  );
}
