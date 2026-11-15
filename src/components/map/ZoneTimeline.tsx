import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import type { TimelinePoint } from '../../types';
import { useI18n } from '../../i18n';

const L = {
  es: { evolution: 'Evolución', water_pct: 'Agua', ndvi: 'Verdor', hv_db: 'Cultivo' },
  en: { evolution: 'Trend', water_pct: 'Water', ndvi: 'Greenness', hv_db: 'Crop' },
};

const ROWS: { key: 'water_pct' | 'ndvi' | 'hv_db'; color: string; unit: string }[] = [
  { key: 'water_pct', color: '#0ea5e9', unit: '%' },
  { key: 'ndvi', color: '#16a34a', unit: '' },
  { key: 'hv_db', color: '#a16207', unit: ' dB' },
];

export default function ZoneTimeline({ points, selected }: { points: TimelinePoint[]; selected?: string }) {
  const { lang, locale, date } = useI18n();
  const s = L[lang];
  if (points.length === 0) return null;
  const month = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { month: 'short' });
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">{s.evolution} {month(points[0].date)}–{month(points[points.length - 1].date)}</div>
      {ROWS.map((r) => {
        const last = (points.find((p) => p.date === selected) ?? points[points.length - 1])[r.key];
        return (
          <div key={r.key} className="grid grid-cols-[48px_1fr_52px] items-center gap-1">
            <span className="text-[10px] text-slate-500">{s[r.key]}</span>
            <div className="h-7">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Line
                    type="monotone"
                    dataKey={r.key}
                    stroke={r.color}
                    strokeWidth={2}
                    dot={(d: { cx?: number; cy?: number; index?: number }) => {
                      const on = points[d.index ?? 0]?.date === selected;
                      if (d.cx == null || d.cy == null) return <g key={d.index} />;
                      return <circle key={d.index} cx={d.cx} cy={d.cy} r={on ? 4 : 2} fill={on ? '#ffffff' : r.color} stroke={r.color} strokeWidth={on ? 2 : 0} />;
                    }}
                    isAnimationActive={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <span className="text-right text-[10px] font-medium">{last ?? '—'}{last != null ? r.unit : ''}</span>
          </div>
        );
      })}
      <div className="ml-[52px] mr-[56px] flex justify-between text-[9px] text-slate-400">
        {points.map((p) => (
          <span key={p.date} className={p.date === selected ? 'font-semibold text-sky-700' : ''}>{date(p.date)}</span>
        ))}
      </div>
    </div>
  );
}
