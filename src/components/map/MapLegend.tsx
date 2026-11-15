import { HV_STOPS, STATUS_COLORS, STATUS_LABELS, VIGOR_STOPS, WATER_STYLE } from './mapStyles';

interface Props {
  colorBy: 'status' | 'vigor';
  date?: string;
  showWater: boolean;
}

export default function MapLegend({ colorBy, date, showWater }: Props) {
  const parcelItems = (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((k) => [STATUS_LABELS[k], STATUS_COLORS[k]]);

  return (
    <div className="card absolute bottom-6 left-3 z-[500] hidden space-y-2 p-3 text-[11px] sm:block">
      {colorBy === 'status' ? (
        <div>
          <div className="mb-1 font-semibold text-slate-600">Parcelas</div>
          {parcelItems.map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: color, background: `${color}33` }} />
              {label}
            </div>
          ))}
        </div>
      ) : (
        <>
          <Gradient title="Vegetación (radar NISAR HV)" colors={HV_STOPS} low="Poca" high="Mucha" />
          <Gradient
            title="Borde: vigor de la zona (NDVI)"
            colors={VIGOR_STOPS.map(([, c]) => c)}
            low={`Bajo ${VIGOR_STOPS[0][0]}`}
            high={`Alto ${VIGOR_STOPS[VIGOR_STOPS.length - 1][0]}`}
          />
        </>
      )}
      {showWater && (
        <div>
          <div className="mb-1 font-semibold text-slate-600">Agua SAR</div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: WATER_STYLE.fillColor }} /> Agua detectada
            {date ? ` · ${date}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function Gradient({ title, colors, low, high }: { title: string; colors: string[]; low: string; high: string }) {
  return (
    <div className="w-44">
      <div className="mb-1 font-semibold text-slate-600">{title}</div>
      <div className="h-2.5 rounded-sm" style={{ background: `linear-gradient(to right, ${colors.join(', ')})` }} />
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
