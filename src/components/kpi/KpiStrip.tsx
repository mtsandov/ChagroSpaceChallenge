import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CloudRain, Droplets } from 'lucide-react';
import type { BasinSummary } from '../../lib/summary';
import type { SarParcelFeature, SarTimeline } from '../../types';
import { useI18n } from '../../i18n';

const L = {
  es: {
    rainBetween: 'Lluvia entre pases de radar',
    rain12: 'Lluvia 12 días antes del pase',
    heavyRain: 'Lluvia fuerte: el radar no es concluyente',
    waterAt: 'Área con agua detectada (SAR) · {{date}}',
    noData: 'Sin datos de clima para estas fechas',
    drySeason: 'Época seca: el agua nueva no viene de la lluvia',
    rainedBetween: 'Hubo lluvia entre las escenas',
    rain15: 'Lluvia NASA POWER · 15 días',
    dryConfirmed: 'Estación seca confirmada',
    recentRain: 'Hubo lluvias recientes',
    waterArea: 'Área con agua detectada (SAR)',
    overQuota: '+{{pct}}% sobre la cuota sostenible',
    withinQuota: 'Dentro de la cuota sostenible',
    chart: 'ET₀ Penman-Monteith vs. lluvia (mm/día)',
    rain: 'Lluvia',
  },
  en: {
    rainBetween: 'Rain between radar passes',
    rain12: 'Rain in the 12 days before the pass',
    heavyRain: 'Heavy rain: radar is inconclusive',
    waterAt: 'Area with water detected (SAR) · {{date}}',
    noData: 'No weather data for these dates',
    drySeason: 'Dry season: new water is not from rain',
    rainedBetween: 'It rained between the scenes',
    rain15: 'NASA POWER rain · 15 days',
    dryConfirmed: 'Dry season confirmed',
    recentRain: 'Recent rain',
    waterArea: 'Area with water detected (SAR)',
    overQuota: '+{{pct}}% over the sustainable quota',
    withinQuota: 'Within the sustainable quota',
    chart: 'Penman-Monteith ET₀ vs. rain (mm/day)',
    rain: 'Rain',
  },
};

interface Props {
  summary: BasinSummary;
  passDate: string | null;
  timeline?: SarTimeline[string];
  zones: SarParcelFeature[];
}

export default function KpiStrip({ summary, passDate, timeline, zones }: Props) {
  const { lang, date } = useI18n();
  const s = L[lang];
  const dates = timeline?.dates ?? [];
  const onTimeline = !!passDate && dates.includes(passDate) && passDate !== summary.sarWindow?.to;
  const cond = onTimeline ? timeline?.conditions[passDate!] : undefined;
  const until = onTimeline ? passDate! : (summary.sarWindow?.to ?? passDate ?? '');
  const days = until ? summary.dailyEt0.filter((d) => d.date <= until) : summary.dailyEt0;
  const chartData = days.slice(-15).map((d) => ({
    date: d.date.slice(5),
    et0: d.et0 === null ? null : Number(d.et0.toFixed(2)),
    lluvia: d.rainfall,
  }));
  let win: { from: string; to: string; rain: number } | null = summary.sarWindow;
  let winTitle = win ? `${s.rainBetween} · ${date(win.from)} – ${date(win.to)}` : '';
  let waterHa = summary.irrigatedHa;
  if (onTimeline && passDate) {
    const prev = dates[dates.indexOf(passDate) - 1];
    const covered = prev && summary.dailyEt0.some((d) => d.date <= prev);
    if (covered) {
      const rain = summary.dailyEt0.filter((d) => d.date > prev && d.date <= passDate).reduce((t, d) => t + d.rainfall, 0);
      win = { from: prev, to: passDate, rain: Math.round(rain * 10) / 10 };
      winTitle = `${s.rainBetween} · ${date(prev)} – ${date(passDate)}`;
    } else {
      win = { from: passDate, to: passDate, rain: cond?.rain_12d_mm ?? 0 };
      winTitle = `${s.rain12} · ${date(passDate)}`;
    }
    waterHa = Math.round(
      zones.reduce((t, f) => {
        const pt = timeline?.zones[f.properties.parcel_id]?.find((x) => x.date === passDate);
        return t + (f.properties.area_hectares * (pt?.water_pct ?? 0)) / 100;
      }, 0),
    );
  }
  const unreliable = cond?.reliable === false;
  const dryWindow = win !== null && win.rain < 10 && !unreliable;
  const quotaPct = Math.round(((waterHa - summary.basin.sustainable_quota_ha) / summary.basin.sustainable_quota_ha) * 100);
  const overQuota = quotaPct > 0;

  return (
    <div className="grid gap-3 border-t border-slate-200 bg-white p-3 md:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.6fr)]">
      {win ? (
        <Kpi
          icon={<CloudRain size={18} />}
          title={winTitle}
          value={`${win.rain.toFixed(1)} mm`}
          hint={unreliable ? s.heavyRain : dryWindow ? s.drySeason : s.rainedBetween}
          tone={unreliable ? 'critical' : dryWindow ? 'warn' : 'ok'}
        />
      ) : (
        <Kpi
          icon={<CloudRain size={18} />}
          title={s.rain15}
          value={`${summary.rain15.toFixed(1)} mm`}
          hint={summary.rain15 < 5 ? s.dryConfirmed : s.recentRain}
          tone={summary.rain15 < 5 ? 'warn' : 'ok'}
        />
      )}
      <Kpi
        icon={<Droplets size={18} />}
        title={passDate ? s.waterAt.replace('{{date}}', date(onTimeline ? passDate : until)) : s.waterArea}
        value={`${waterHa} ha`}
        hint={overQuota ? s.overQuota.replace('{{pct}}', String(quotaPct)) : s.withinQuota}
        tone={overQuota ? 'critical' : 'ok'}
      />
      <div className="card p-2">
        <div className="px-1 text-xs font-medium text-slate-500">
          {s.chart}
          {chartData.length > 0 && ` · ${date(days[Math.max(days.length - 15, 0)].date)} – ${date(days[days.length - 1].date)}`}
        </div>
        <div className="h-28">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">{s.noData}</div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              <Bar dataKey="et0" name="ET₀" fill="#f97316" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="lluvia" name={s.rain} fill="#0ea5e9" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          )}
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
