import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CloudRain, Droplets, Waves } from 'lucide-react';
import type { BasinSummary } from '../../lib/summary';
import { ALERT_COLORS, ALERT_LABELS } from '../map/mapStyles';

export default function KpiStrip({ summary }: { summary: BasinSummary }) {
  const chartData = summary.dailyEt0.slice(-15).map((d) => ({
    date: d.date.slice(5),
    et0: d.et0 === null ? null : Number(d.et0.toFixed(2)),
    lluvia: d.rainfall,
  }));
  const station = summary.lowestStation;
  const overQuota = summary.quotaPct > 0;

  return (
    <div className="grid gap-3 border-t border-slate-200 bg-white p-3 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.6fr)]">
      <Kpi
        icon={<CloudRain size={18} />}
        title="Lluvia NASA POWER · 15 días"
        value={`${summary.rain15.toFixed(1)} mm`}
        hint={summary.rain15 < 5 ? 'Estación seca confirmada' : 'Hubo lluvias recientes'}
        tone={summary.rain15 < 5 ? 'warn' : 'ok'}
      />
      <Kpi
        icon={<Droplets size={18} />}
        title="Área con agua detectada (SAR)"
        value={`${summary.irrigatedHa} ha`}
        hint={overQuota ? `+${summary.quotaPct}% sobre la cuota sostenible` : 'Dentro de la cuota sostenible'}
        tone={overQuota ? 'critical' : 'ok'}
      />
      <Kpi
        icon={<Waves size={18} />}
        title="Estero comunitario más bajo"
        value={station ? `${station.canal_level_pct}%` : '—'}
        hint={station ? `${station.name} · ${ALERT_LABELS[station.alert_level]}` : 'Sin estaciones'}
        tone={station?.alert_level === 'critical_low' ? 'critical' : station?.alert_level === 'warning' ? 'warn' : 'ok'}
        valueColor={station ? ALERT_COLORS[station.alert_level] : undefined}
      />
      <div className="card p-2">
        <div className="px-1 text-xs font-medium text-slate-500">ET₀ Penman-Monteith vs. lluvia (mm/día)</div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              <Bar dataKey="et0" name="ET₀" fill="#f97316" radius={[2, 2, 0, 0]} />
              <Bar dataKey="lluvia" name="Lluvia" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const TONES = {
  ok: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

function Kpi(props: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
  tone: keyof typeof TONES;
  valueColor?: string;
}) {
  return (
    <div className="card flex flex-col justify-between p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className={`rounded-md p-1 ${TONES[props.tone]}`}>{props.icon}</span>
        {props.title}
      </div>
      <div className="mt-1 text-2xl font-bold" style={props.valueColor ? { color: props.valueColor } : undefined}>
        {props.value}
      </div>
      <div className={`mt-1 self-start rounded px-1.5 py-0.5 text-[11px] font-medium ${TONES[props.tone]}`}>{props.hint}</div>
    </div>
  );
}
