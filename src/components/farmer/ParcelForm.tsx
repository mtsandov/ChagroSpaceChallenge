import { useState, type FormEvent } from 'react';
import type { FarmerParcel, IrrigationType } from '../../types';
import { CROPS, SOIL_TYPES } from '../../data/crops';
import ParcelDrawMap, { polygonAreaHa, polygonCenter } from './ParcelDrawMap';

const BASINS = [
  { id: 'daule', name: 'Daule', center: [-1.865, -79.985] as [number, number] },
  { id: 'santa-elena', name: 'Santa Elena', center: [-2.235, -80.585] as [number, number] },
];

const TYPES: { id: IrrigationType; label: string; mode: 'per_plant' | 'per_area'; efficiency: number }[] = [
  { id: 'drip', label: 'Goteo', mode: 'per_plant', efficiency: 90 },
  { id: 'micro_sprinkler', label: 'Microaspersión', mode: 'per_plant', efficiency: 85 },
  { id: 'sprinkler', label: 'Aspersión', mode: 'per_area', efficiency: 75 },
  { id: 'furrow', label: 'Surcos', mode: 'per_area', efficiency: 60 },
  { id: 'flood', label: 'Inundación', mode: 'per_area', efficiency: 55 },
];

export default function ParcelForm({ onSave, onCancel }: { onSave: (p: FarmerParcel) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: '',
    basin_id: 'daule',
    crop_id: 'rice',
    planting_date: new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10),
    soil_type_id: 'clay',
    area_ha: 5,
    type: 'flood' as IrrigationType,
    efficiency: 55,
    num_plants: 1000,
    canopy_radius_m: 1,
    flow_rate_lph: 4,
    emitters: 2,
    system_flow_m3h: 100,
    percolation_mm_day: 3,
    pump_kw: 10,
    pump_head_m: 10,
  });
  const [draw, setDraw] = useState(true);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [drawError, setDrawError] = useState(false);
  const set = (k: keyof typeof f, v: string | number) => setF((prev) => ({ ...prev, [k]: v }));
  const drawnArea = draw && points.length >= 3 ? +polygonAreaHa(points).toFixed(2) : null;
  const type = TYPES.find((t) => t.id === f.type)!;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const basin = BASINS.find((b) => b.id === f.basin_id)!;
    if (draw && points.length < 3) {
      setDrawError(true);
      return;
    }
    onSave({
      id: `local-${Date.now()}`,
      name: f.name,
      basin_id: f.basin_id,
      crop_id: f.crop_id,
      planting_date: f.planting_date,
      soil_type_id: f.soil_type_id,
      area_ha: drawnArea ?? Number(f.area_ha),
      center: drawnArea ? polygonCenter(points) : basin.center,
      ...(drawnArea ? { polygon: points } : {}),
      irrigation: {
        type: f.type,
        mode: type.mode,
        efficiency: Number(f.efficiency),
        pump_kw: Number(f.pump_kw) || undefined,
        pump_head_m: Number(f.pump_head_m) || undefined,
        ...(type.mode === 'per_plant'
          ? {
              num_plants: Number(f.num_plants),
              canopy_radius_m: Number(f.canopy_radius_m),
              flow_rate_lph: Number(f.flow_rate_lph),
              emitters: Number(f.emitters),
            }
          : {
              system_flow_m3h: Number(f.system_flow_m3h),
              percolation_mm_day: f.crop_id === 'rice' ? Number(f.percolation_mm_day) : 0,
            }),
      },
    });
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-4">
      <div className="text-lg font-semibold">Nueva parcela y sistema de riego</div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nombre">
          <input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Lote 3" />
        </Field>
        <Field label="Cuenca">
          <select
            className="input"
            value={f.basin_id}
            onChange={(e) => {
              set('basin_id', e.target.value);
              setPoints([]);
            }}
          >
            {BASINS.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Área (ha)">
          <input
            className="input"
            type="number"
            min={0.1}
            step={0.01}
            required
            disabled={drawnArea !== null}
            value={drawnArea ?? f.area_ha}
            onChange={(e) => set('area_ha', e.target.value)}
          />
        </Field>
        <Field label="Cultivo">
          <select className="input" value={f.crop_id} onChange={(e) => set('crop_id', e.target.value)}>
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de siembra">
          <input className="input" type="date" required value={f.planting_date} onChange={(e) => set('planting_date', e.target.value)} />
        </Field>
        <Field label="Suelo">
          <select className="input" value={f.soil_type_id} onChange={(e) => set('soil_type_id', e.target.value)}>
            {SOIL_TYPES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Ubicación de la parcela</div>
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
            {[
              { v: true, label: 'Dibujar en el mapa' },
              { v: false, label: 'Solo datos' },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  setDraw(o.v);
                  setDrawError(false);
                }}
                className={`rounded-md px-3 py-1.5 ${draw === o.v ? 'bg-white font-semibold shadow' : 'text-slate-500'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {draw ? (
          <>
            <ParcelDrawMap
              center={BASINS.find((b) => b.id === f.basin_id)!.center}
              points={points}
              onChange={(p) => {
                setPoints(p);
                setDrawError(false);
              }}
            />
            {drawError && <div className="mt-2 text-xs text-red-600">Marca al menos 3 esquinas o elige "Solo datos".</div>}
          </>
        ) : (
          <p className="text-xs text-slate-500">La parcela se ubicará en el centro de la cuenca con el área que indiques arriba.</p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-2 text-sm font-semibold">Sistema de riego</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tipo">
            <select
              className="input"
              value={f.type}
              onChange={(e) => {
                const t = TYPES.find((x) => x.id === e.target.value)!;
                setF((prev) => ({ ...prev, type: t.id, efficiency: t.efficiency }));
              }}
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Eficiencia (%)">
            <input className="input" type="number" min={10} max={100} required value={f.efficiency} onChange={(e) => set('efficiency', e.target.value)} />
          </Field>
          {type.mode === 'per_plant' ? (
            <>
              <Field label="Nº de plantas">
                <input className="input" type="number" min={1} required value={f.num_plants} onChange={(e) => set('num_plants', e.target.value)} />
              </Field>
              <Field label="Radio de copa (m)">
                <input className="input" type="number" min={0.1} step={0.1} required value={f.canopy_radius_m} onChange={(e) => set('canopy_radius_m', e.target.value)} />
              </Field>
              <Field label="Caudal por emisor (L/h)">
                <input className="input" type="number" min={0.1} step={0.1} required value={f.flow_rate_lph} onChange={(e) => set('flow_rate_lph', e.target.value)} />
              </Field>
              <Field label="Emisores por planta">
                <input className="input" type="number" min={1} required value={f.emitters} onChange={(e) => set('emitters', e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Caudal del sistema (m³/h)">
                <input className="input" type="number" min={1} required value={f.system_flow_m3h} onChange={(e) => set('system_flow_m3h', e.target.value)} />
              </Field>
              {f.crop_id === 'rice' && (
                <Field label="Percolación (mm/día)">
                  <input className="input" type="number" min={0} step={0.5} value={f.percolation_mm_day} onChange={(e) => set('percolation_mm_day', e.target.value)} />
                </Field>
              )}
            </>
          )}
          <Field label="Potencia bomba (kW)">
            <input className="input" type="number" min={0} step={0.5} value={f.pump_kw} onChange={(e) => set('pump_kw', e.target.value)} />
          </Field>
          <Field label="Altura de bombeo (m)">
            <input className="input" type="number" min={0} step={0.5} value={f.pump_head_m} onChange={(e) => set('pump_head_m', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary">Guardar parcela</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
