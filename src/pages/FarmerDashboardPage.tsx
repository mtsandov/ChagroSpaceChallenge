import { useEffect, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, Clock, Droplet, Gauge, Loader2, Plus, Sprout, Zap } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import ParcelForm from '../components/farmer/ParcelForm';
import { useAuth } from '../context/AuthContext';
import { useFarmerParcels } from '../lib/farmerStore';
import { apiPost } from '../lib/api/client';
import type { FarmerRecommendationResult } from '../lib/summary';
import { findCrop } from '../data/crops';

const IRRIGATION_LABELS: Record<string, string> = {
  drip: 'Goteo',
  sprinkler: 'Aspersión',
  micro_sprinkler: 'Microaspersión',
  furrow: 'Surcos',
  flood: 'Inundación',
  subsurface: 'Subterráneo',
  other: 'Otro',
};

export default function FarmerDashboardPage() {
  const { user, getAccessToken } = useAuth();
  const { parcels, loading, addParcel } = useFarmerParcels(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [deficit, setDeficit] = useState(0);
  const [result, setResult] = useState<FarmerRecommendationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!selectedId && parcels.length > 0) setSelectedId(parcels[0].id);
  }, [parcels, selectedId]);

  const selected = parcels.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setBusy(true);
    setError(null);
    getAccessToken()
      .then((token) =>
        apiPost<FarmerRecommendationResult>('/api/recommend', { parcel_id: selected.id, parcel: selected, days, deficit_pct: deficit }, token),
      )
      .then((r) => alive && setResult(r))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [selected, days, deficit, getAccessToken]);

  const rec = result?.recommendation;

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Lista de parcelas */}
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Mis parcelas</h1>
            <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Nueva
            </button>
          </div>
          {loading && <div className="text-sm text-slate-500">Cargando…</div>}
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
                {findCrop(p.crop_id)?.name} · {p.area_ha} ha · {IRRIGATION_LABELS[p.irrigation.type]}
              </div>
            </button>
          ))}
        </aside>

        {/* Recomendación */}
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
                <div className="text-xs uppercase tracking-wide text-slate-500">Recomendación de riego</div>
                <div className="text-xl font-bold">{selected.name}</div>
                {result && (
                  <div className="text-sm text-slate-500">
                    {result.cropName} · etapa <strong>{result.stageName}</strong> (día {result.daysSincePlanting}) · Kc{' '}
                    {rec?.kc} · suelo {result.soilName}
                  </div>
                )}
              </div>
              <div>
                <span className="label">Período</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`rounded-md px-3 py-1.5 ${days === d ? 'bg-white font-semibold shadow' : 'text-slate-500'}`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-48">
                <label className="label" htmlFor="deficit">
                  Riego deficitario: {deficit}%
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
                <Stat icon={<Droplet size={16} />} label="Lámina bruta" value={`${rec.grossMm.toFixed(1)} mm`} sub={`neta ${rec.netMm.toFixed(1)} mm · ef. ${selected!.irrigation.efficiency}%`} />
                <Stat
                  icon={<Gauge size={16} />}
                  label="Volumen total"
                  value={`${fmt(rec.volumeM3)} m³`}
                  sub={rec.volumePerPlantL !== null ? `${rec.volumePerPlantL.toFixed(1)} L/planta` : `${selected!.area_ha} ha`}
                />
                <Stat icon={<Clock size={16} />} label="Tiempo de riego" value={`${rec.irrigationTimeH.toFixed(1)} h`} sub={`para ${rec.days} días`} />
                <Stat icon={<Zap size={16} />} label="Energía de bombeo" value={`${fmt(rec.energyKwh)} kWh`} sub={deficit > 0 ? `ahorro ${fmt(rec.savedKwh)} kWh` : 'sin reducción'} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="card p-4">
                  <div className="mb-2 text-sm font-semibold">ETc diaria vs. lluvia (mm)</div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={rec.rows.map((r) => ({ date: r.date.slice(5), etc: +r.etc.toFixed(2), lluvia: r.rainfall }))}>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="etc" name="ETc (ET₀ × Kc)" fill="#f97316" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="lluvia" name="Lluvia" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                    <Mini label="Σ ET₀" value={`${rec.et0Sum.toFixed(1)} mm`} />
                    <Mini label="Σ ETc" value={`${rec.etcSum.toFixed(1)} mm`} />
                    <Mini label="Lluvia efectiva" value={`${rec.effectiveRainfallSum.toFixed(1)} mm`} />
                    <Mini label="Percolación" value={`${rec.percolationSum.toFixed(1)} mm`} />
                  </div>
                </div>

                <div className="card space-y-3 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarClock size={16} /> Humedad del suelo (SAR)
                  </div>
                  <div
                    className={`rounded-lg p-3 text-center ${rec.needsIrrigationNow ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    <div className="text-2xl font-bold">{rec.needsIrrigationNow ? 'Regar hoy' : `En ${rec.daysUntilIrrigation} días`}</div>
                    <div className="text-xs">próximo riego estimado</div>
                  </div>
                  <DepletionBar depletion={rec.currentDepletionMm} raw={rec.rawMm} taw={rec.tawMm} />
                  <p className="text-xs text-slate-500">
                    Humedad observada: {result.soilMoisture ?? '—'} m³/m³. Se riega cuando el agotamiento supera el umbral RAW (
                    {rec.rawMm.toFixed(0)} mm) de {rec.tawMm.toFixed(0)} mm disponibles en la zona radicular.
                  </p>
                  {deficit > 0 && (
                    <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
                      Con un riego deficitario del <strong>{deficit}%</strong> ahorras <strong>{fmt(rec.savedM3)} m³</strong> de agua y{' '}
                      <strong>{fmt(rec.savedKwh)} kWh</strong>.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!selected && !loading && !showForm && (
            <div className="card p-8 text-center text-slate-500">Registra tu primera parcela para recibir recomendaciones.</div>
          )}
          {busy && !rec && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Calculando…
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const fmt = (v: number) => v.toLocaleString('es-EC', { maximumFractionDigits: v < 10 ? 2 : 0 });

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

function DepletionBar({ depletion, raw, taw }: { depletion: number; raw: number; taw: number }) {
  const pct = taw > 0 ? Math.min(100, (depletion / taw) * 100) : 0;
  const rawPct = taw > 0 ? (raw / taw) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
        <span>Capacidad de campo</span>
        <span>Marchitez</span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-300">
        <div className="absolute top-0 h-3 w-0.5 bg-slate-700" style={{ left: `${rawPct}%` }} title="Umbral RAW" />
        <div
          className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-sky-600 shadow"
          style={{ left: `${pct}%` }}
          title={`Agotamiento ${depletion.toFixed(1)} mm`}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-600">Agotamiento actual: {depletion.toFixed(1)} mm</div>
    </div>
  );
}
