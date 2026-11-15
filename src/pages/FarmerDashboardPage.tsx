import { useEffect, useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, Clock, Droplet, Gauge, Loader2, Plus, Sprout, Zap } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import ParcelForm from '../components/farmer/ParcelForm';
import { useAuth } from '../context/AuthContext';
import { useFarmerParcels } from '../lib/farmerStore';
import { useViewerData } from '../lib/api/useViewerData';
import { recommendForParcel } from '../lib/summary';
import { useI18n } from '../i18n';

const L = {
  es: {
    noWeather: 'Sin datos de clima para la cuenca',
    myParcels: 'Mis parcelas',
    add: 'Nueva',
    loading: 'Cargando…',
    advice: 'Recomendación de riego',
    stage: 'etapa',
    day: 'día',
    soil: 'suelo',
    period: 'Período',
    days: 'días',
    deficitIrr: 'Riego deficitario',
    gross: 'Lámina bruta',
    net: 'neta',
    eff: 'ef.',
    volume: 'Volumen total',
    perPlant: 'L/planta',
    time: 'Tiempo de riego',
    forDays: 'para {{n}} días',
    energy: 'Energía de bombeo',
    saving: 'ahorro',
    noReduction: 'sin reducción',
    chart: 'ETc diaria vs. lluvia (mm)',
    rain: 'Lluvia',
    effRain: 'Lluvia efectiva',
    percolation: 'Percolación',
    soilMoisture: 'Humedad del suelo (SAR)',
    irrigateToday: 'Regar hoy',
    inDays: 'En {{n}} días',
    nextIrrigation: 'próximo riego estimado',
    observed: 'Humedad observada',
    rawText: 'Se riega cuando el agotamiento supera el umbral RAW ({{raw}} mm) de {{taw}} mm disponibles en la zona radicular.',
    deficitText: 'Con un riego deficitario del {{pct}}% ahorras {{m3}} m³ de agua y {{kwh}} kWh.',
    empty: 'Registra tu primera parcela para recibir recomendaciones.',
    computing: 'Calculando…',
    fieldCapacity: 'Capacidad de campo',
    wilting: 'Marchitez',
    rawThreshold: 'Umbral RAW',
    depletion: 'Agotamiento',
    currentDepletion: 'Agotamiento actual',
  },
  en: {
    noWeather: 'No weather data for this basin',
    myParcels: 'My parcels',
    add: 'New',
    loading: 'Loading…',
    advice: 'Irrigation advice',
    stage: 'stage',
    day: 'day',
    soil: 'soil',
    period: 'Period',
    days: 'days',
    deficitIrr: 'Deficit irrigation',
    gross: 'Gross depth',
    net: 'net',
    eff: 'eff.',
    volume: 'Total volume',
    perPlant: 'L/plant',
    time: 'Irrigation time',
    forDays: 'for {{n}} days',
    energy: 'Pumping energy',
    saving: 'saving',
    noReduction: 'no reduction',
    chart: 'Daily ETc vs. rain (mm)',
    rain: 'Rain',
    effRain: 'Effective rain',
    percolation: 'Percolation',
    soilMoisture: 'Soil moisture (SAR)',
    irrigateToday: 'Irrigate today',
    inDays: 'In {{n}} days',
    nextIrrigation: 'estimated next irrigation',
    observed: 'Observed moisture',
    rawText: 'Irrigate when depletion exceeds the RAW threshold ({{raw}} mm) of the {{taw}} mm available in the root zone.',
    deficitText: 'With {{pct}}% deficit irrigation you save {{m3}} m³ of water and {{kwh}} kWh.',
    empty: 'Register your first parcel to get recommendations.',
    computing: 'Calculating…',
    fieldCapacity: 'Field capacity',
    wilting: 'Wilting point',
    rawThreshold: 'RAW threshold',
    depletion: 'Depletion',
    currentDepletion: 'Current depletion',
  },
};

type Strings = (typeof L)['es'];

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(v[k] ?? ''));

export default function FarmerDashboardPage() {
  const { user } = useAuth();
  const { lang, tx, locale } = useI18n();
  const s = L[lang];
  const fmt = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: v < 10 ? 2 : 0 });
  const { data } = useViewerData();
  const { parcels, loading, addParcel } = useFarmerParcels(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [deficit, setDeficit] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!selectedId && parcels.length > 0) setSelectedId(parcels[0].id);
  }, [parcels, selectedId]);

  const selected = parcels.find((p) => p.id === selectedId) ?? null;

  const result = useMemo(() => {
    const weather = selected && data?.weather[selected.basin_id];
    if (!selected || !weather) return null;
    const nearest = data.parcels.features
      .filter((f) => f.properties.basin_id === selected.basin_id)
      .map((f) => {
        const [lng, lat] = f.geometry.coordinates[0][0];
        return { f, d: Math.hypot(lat - selected.center[0], lng - selected.center[1]) };
      })
      .sort((x, y) => x.d - y.d)[0]?.f;
    return recommendForParcel(selected, weather, {
      days,
      deficitFraction: deficit / 100,
      soilMoisture: nearest?.properties.soil_moisture_m3m3,
    });
  }, [selected, data, days, deficit]);
  const error = selected && data && !data.weather[selected.basin_id] ? s.noWeather : null;
  const busy = !data;

  const rec = result?.recommendation;

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">{s.myParcels}</h1>
            <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Plus size={14} /> {s.add}
            </button>
          </div>
          {loading && <div className="text-sm text-slate-500">{s.loading}</div>}
          {parcels.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`card w-full p-3 text-left transition ${p.id === selectedId ? 'border-brand-500 ring-2 ring-brand-500/20' : 'hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Sprout size={16} className="text-brand-600" /> {p.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {tx(`crop.${p.crop_id}`, p.crop_id)} · {p.area_ha} ha · {tx(`irrigation.${p.irrigation.type}`, p.irrigation.type)}
              </div>
            </button>
          ))}
        </aside>

        <section className="min-w-0 space-y-4">
          {showForm && (
            <ParcelForm
              onCancel={() => setShowForm(false)}
              onSave={(p) => {
                addParcel(p);
                setSelectedId(p.id);
                setShowForm(false);
              }}
            />
          )}

          {selected && (
            <div className="card flex flex-wrap items-end gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wide text-slate-500">{s.advice}</div>
                <div className="text-xl font-bold">{selected.name}</div>
                {result && (
                  <div className="text-sm text-slate-500">
                    {tx(`crop.${selected.crop_id}`, result.cropName)} · {s.stage} <strong>{tx(`stage.${result.stageName}`, result.stageName)}</strong> ({s.day}{' '}
                    {result.daysSincePlanting}) · Kc {rec?.kc} · {s.soil} {tx(`soil.${selected.soil_type_id}`, result.soilName)}
                  </div>
                )}
              </div>
              <div>
                <span className="label">{s.period}</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`rounded-md px-3 py-1.5 ${days === d ? 'bg-white font-semibold shadow' : 'text-slate-500'}`}
                    >
                      {d} {s.days}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-48">
                <label className="label" htmlFor="deficit">
                  {s.deficitIrr}: {deficit}%
                </label>
                <input
                  id="deficit"
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={deficit}
                  onChange={(e) => setDeficit(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
              </div>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {rec && result && (
            <div className={`space-y-4 transition-opacity ${busy ? 'opacity-60' : ''}`}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat icon={<Droplet size={16} />} label={s.gross} value={`${rec.grossMm.toFixed(1)} mm`} sub={`${s.net} ${rec.netMm.toFixed(1)} mm · ${s.eff} ${selected!.irrigation.efficiency}%`} />
                <Stat
                  icon={<Gauge size={16} />}
                  label={s.volume}
                  value={`${fmt(rec.volumeM3)} m³`}
                  sub={rec.volumePerPlantL !== null ? `${rec.volumePerPlantL.toFixed(1)} ${s.perPlant}` : `${selected!.area_ha} ha`}
                />
                <Stat icon={<Clock size={16} />} label={s.time} value={`${rec.irrigationTimeH.toFixed(1)} h`} sub={fill(s.forDays, { n: rec.days })} />
                <Stat icon={<Zap size={16} />} label={s.energy} value={`${fmt(rec.energyKwh)} kWh`} sub={deficit > 0 ? `${s.saving} ${fmt(rec.savedKwh)} kWh` : s.noReduction} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="card p-4">
                  <div className="mb-2 text-sm font-semibold">{s.chart}</div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={rec.rows.map((r) => ({ date: r.date.slice(5), etc: +r.etc.toFixed(2), lluvia: r.rainfall }))}>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="etc" name="ETc (ET₀ × Kc)" fill="#f97316" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="lluvia" name={s.rain} fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                    <Mini label="Σ ET₀" value={`${rec.et0Sum.toFixed(1)} mm`} />
                    <Mini label="Σ ETc" value={`${rec.etcSum.toFixed(1)} mm`} />
                    <Mini label={s.effRain} value={`${rec.effectiveRainfallSum.toFixed(1)} mm`} />
                    <Mini label={s.percolation} value={`${rec.percolationSum.toFixed(1)} mm`} />
                  </div>
                </div>

                <div className="card space-y-3 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarClock size={16} /> {s.soilMoisture}
                  </div>
                  <div
                    className={`rounded-lg p-3 text-center ${rec.needsIrrigationNow ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    <div className="text-2xl font-bold">{rec.needsIrrigationNow ? s.irrigateToday : fill(s.inDays, { n: rec.daysUntilIrrigation })}</div>
                    <div className="text-xs">{s.nextIrrigation}</div>
                  </div>
                  <DepletionBar s={s} depletion={rec.currentDepletionMm} raw={rec.rawMm} taw={rec.tawMm} />
                  <p className="text-xs text-slate-500">
                    {s.observed}: {result.soilMoisture ?? '—'} m³/m³.{' '}
                    {fill(s.rawText, { raw: rec.rawMm.toFixed(0), taw: rec.tawMm.toFixed(0) })}
                  </p>
                  {deficit > 0 && (
                    <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
                      {fill(s.deficitText, { pct: deficit, m3: fmt(rec.savedM3), kwh: fmt(rec.savedKwh) })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!selected && !loading && !showForm && (
            <div className="card p-8 text-center text-slate-500">{s.empty}</div>
          )}
          {busy && !rec && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> {s.computing}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="text-brand-600">{icon}</span> {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <div className="text-[10px] uppercase text-slate-400">{label}</div>
      <div className="font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function DepletionBar({ s, depletion, raw, taw }: { s: Strings; depletion: number; raw: number; taw: number }) {
  const pct = taw > 0 ? Math.min(100, (depletion / taw) * 100) : 0;
  const rawPct = taw > 0 ? (raw / taw) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
        <span>{s.fieldCapacity}</span>
        <span>{s.wilting}</span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-300">
        <div className="absolute top-0 h-3 w-0.5 bg-slate-700" style={{ left: `${rawPct}%` }} title={s.rawThreshold} />
        <div
          className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-sky-600 shadow"
          style={{ left: `${pct}%` }}
          title={`${s.depletion} ${depletion.toFixed(1)} mm`}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-600">{s.currentDepletion}: {depletion.toFixed(1)} mm</div>
    </div>
  );
}
