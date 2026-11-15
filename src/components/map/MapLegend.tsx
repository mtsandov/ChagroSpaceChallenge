import { HV_STOPS, STATUS_COLORS, VIGOR_STOPS, WATER_STYLE } from './mapStyles';
import { useI18n } from '../../i18n';

const L = {
  es: { parcels: 'Parcelas', hv: 'Vegetación (radar NISAR HV)', little: 'Poca', much: 'Mucha', border: 'Borde: vigor de la zona (NDVI)', low: 'Bajo', high: 'Alto', water: 'Agua SAR', detected: 'Agua detectada' },
  en: { parcels: 'Parcels', hv: 'Vegetation (NISAR HV radar)', little: 'Low', much: 'High', border: 'Outline: zone vigor (NDVI)', low: 'Low', high: 'High', water: 'SAR water', detected: 'Water detected' },
};

interface Props {
  colorBy: 'status' | 'vigor';
  date?: string;
  showWater: boolean;
}

export default function MapLegend({ colorBy, date, showWater }: Props) {
  const { lang, t, date: fmtDate } = useI18n();
  const s = L[lang];
  const parcelItems = (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((k) => [t(`status.${k}`), STATUS_COLORS[k]]);

  return (
    <div className="card absolute bottom-6 left-3 z-[500] hidden space-y-2 p-3 text-[11px] sm:block">
      {colorBy === 'status' ? (
        <div>
          <div className="mb-1 font-semibold text-slate-600">{s.parcels}</div>
          {parcelItems.map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: color, background: `${color}33` }} />
              {label}
            </div>
          ))}
        </div>
      ) : (
        <>
          <Gradient title={s.hv} colors={HV_STOPS} low={s.little} high={s.much} />
          <Gradient
            title={s.border}
            colors={VIGOR_STOPS.map(([, c]) => c)}
            low={`${s.low} ${VIGOR_STOPS[0][0]}`}
            high={`${s.high} ${VIGOR_STOPS[VIGOR_STOPS.length - 1][0]}`}
          />
        </>
      )}
      {showWater && (
        <div>
          <div className="mb-1 font-semibold text-slate-600">{s.water}</div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: WATER_STYLE.fillColor }} /> {s.detected}
            {date ? ` · ${fmtDate(date, true)}` : ''}
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
