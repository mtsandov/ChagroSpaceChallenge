import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';

const SOURCES = [
  {
    name: 'NISAR L2 GCOV',
    provider: 'NASA / ISRO · ASF DAAC',
    es: 'Radar HH y HV: agua superficial, vegetación y línea de tiempo de junio a octubre',
    en: 'HH and HV radar: surface water, vegetation and the June–October timeline',
  },
  {
    name: 'NISAR L3 SME2',
    provider: 'NASA / ISRO',
    es: 'Humedad de suelo por zona (déficit hídrico)',
    en: 'Soil moisture per zone (water deficit)',
  },
  {
    name: 'SMAP SPL3SMP_E',
    provider: 'NASA JPL / NSIDC',
    es: 'Humedad de suelo regional para validar el radar en días de lluvia',
    en: 'Regional soil moisture to validate the radar on rainy days',
  },
  {
    name: 'VIIRS VNP13A1',
    provider: 'NASA LP DAAC',
    es: 'NDVI: vigor del cultivo',
    en: 'NDVI: crop vigor',
  },
  {
    name: 'NASA POWER',
    provider: 'NASA LaRC',
    es: 'Lluvia, radiación, temperatura, humedad y viento diarios → ET₀ Penman-Monteith; promedio histórico 2001–2025',
    en: 'Daily rain, radiation, temperature, humidity and wind → Penman-Monteith ET₀; 2001–2025 climatology',
  },
  {
    name: 'GEOS-FP',
    provider: 'NASA GMAO',
    es: 'Pronóstico de 72 h',
    en: '72 h forecast',
  },
  {
    name: 'MapBiomas Ecuador',
    provider: 'MapBiomas',
    es: 'Uso de suelo: ubicación de las zonas agrícolas (no es NASA)',
    en: 'Land use: location of the farm zones (not NASA)',
  },
];

const L = {
  es: {
    title: 'Fuentes de datos',
    subtitle: 'ChAgro usa datos abiertos de la NASA.',
    note: 'Demo: los datos satelitales son reales (2026). Las parcelas del agricultor y el inicio de sesión son de demostración.',
    product: 'Producto',
    provider: 'Proveedor',
    use: 'Uso en ChAgro',
    close: 'Cerrar',
  },
  en: {
    title: 'Data sources',
    subtitle: 'ChAgro uses open NASA data.',
    note: 'Demo: the satellite data is real (2026). Farmer parcels and sign-in are for demonstration only.',
    product: 'Product',
    provider: 'Provider',
    use: 'Use in ChAgro',
    close: 'Close',
  },
};

export default function DataSourcesModal({ onClose }: { onClose: () => void }) {
  const { lang } = useI18n();
  const s = L[lang];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-title"
        className="card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="sources-title" className="text-lg font-semibold">
              {s.title}
            </h2>
            <p className="text-sm text-slate-500">{s.subtitle}</p>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose} aria-label={s.close}>
            <X size={18} />
          </button>
        </div>
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">{s.note}</div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="pb-2 pr-3">{s.product}</th>
              <th className="pb-2 pr-3">{s.provider}</th>
              <th className="pb-2">{s.use}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SOURCES.map((src) => (
              <tr key={src.name}>
                <td className="py-2 pr-3 font-medium">{src.name}</td>
                <td className="py-2 pr-3 text-slate-600">{src.provider}</td>
                <td className="py-2 text-slate-600">{src[lang]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
