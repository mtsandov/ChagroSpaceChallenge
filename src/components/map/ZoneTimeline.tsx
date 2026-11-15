import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import type { TimelinePoint } from '../../types';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ROWS: { key: 'water_pct' | 'ndvi' | 'hv_db'; label: string; color: string; unit: string }[] = [
  { key: 'water_pct', label: 'Agua', color: '#0ea5e9', unit: '%' },
  { key: 'ndvi', label: 'Verdor', color: '#16a34a', unit: '' },
  { key: 'hv_db', label: 'Cultivo', color: '#a16207', unit: ' dB' },
];

export default function ZoneTimeline({ points, selected }: { points: TimelinePoint[]; selected?: string }) {
  if (points.length === 0) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">Evolución {MONTHS[+points[0].date.slice(5, 7) - 1]}–{MONTHS[+points[points.length - 1].date.slice(5, 7) - 1]}</div>
      {ROWS.map((r) => {
        const last = (points.find((p) => p.date === selected) ?? points[points.length - 1])[r.key];
        return (
          <div key={r.key} className="grid grid-cols-[48px_1fr_52px] items-center gap-1">
            <span className="text-[10px] text-slate-500">{r.label}</span>
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
          <span key={p.date} className={p.date === selected ? 'font-semibold text-sky-700' : ''}>{+p.date.slice(8, 10)} {MONTHS[+p.date.slice(5, 7) - 1]}</span>
        ))}
      </div>
    </div>
  );
}
