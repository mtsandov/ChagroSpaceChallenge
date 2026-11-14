import { useState } from 'react';
import { Layers, SplitSquareHorizontal } from 'lucide-react';

export interface LayerState {
  waterMask: boolean;
  parcels: boolean;
  stations: boolean;
  colorBy: 'status' | 'zone';
  compare: boolean;
}

interface Props {
  value: LayerState;
  onChange: (v: LayerState) => void;
}

export default function LayerControls({ value, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const set = <K extends keyof LayerState>(k: K, v: LayerState[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="absolute right-3 top-3 z-[500] w-60 text-sm">
      <div className="card overflow-hidden">
        <button
          className="flex w-full items-center justify-between px-3 py-2 font-semibold text-slate-700"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            <Layers size={16} /> Capas
          </span>
          <span className="text-xs text-slate-400">{open ? 'ocultar' : 'mostrar'}</span>
        </button>
        {open && (
          <div className="space-y-2 border-t border-slate-100 px-3 py-3">
            <Toggle label="Máscara de agua SAR" checked={value.waterMask} onChange={(v) => set('waterMask', v)} />
            <Toggle label="Parcelas" checked={value.parcels} onChange={(v) => set('parcels', v)} />
            <Toggle label="Estaciones de canal" checked={value.stations} onChange={(v) => set('stations', v)} />

            <div className="pt-1">
              <div className="label">Colorear parcelas por</div>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
                {(['status', 'zone'] as const).map((k) => (
                  <button
                    key={k}
                    className={`rounded-md px-2 py-1 ${value.colorBy === k ? 'bg-white font-semibold shadow' : 'text-slate-500'}`}
                    onClick={() => set('colorBy', k)}
                  >
                    {k === 'status' ? 'Estado SAR' : 'Finca / comunidad'}
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`btn mt-1 w-full py-1.5 text-xs ${value.compare ? 'bg-sky-600 text-white hover:bg-sky-700' : 'btn-secondary'}`}
              onClick={() => onChange({ ...value, compare: !value.compare, waterMask: true })}
            >
              <SplitSquareHorizontal size={14} />
              {value.compare ? 'Salir de comparación' : 'Comparar antes / después'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="text-slate-700">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-brand-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
