import { useEffect } from 'react';
import { X } from 'lucide-react';

const SOURCES = [
  { name: 'NISAR GCOV', provider: 'NASA / ISRO vía ASF DAAC', use: 'Retrodispersión SAR: escena base y pase actual, máscara de agua superficial' },
  { name: 'NISAR SME2', provider: 'NASA / ISRO', use: 'Humedad de suelo derivada de SAR por parcela' },
  { name: 'NASA POWER', provider: 'NASA LaRC', use: 'Lluvia, radiación, temperatura, humedad y viento diarios → ET₀ Penman-Monteith' },
  { name: 'SMAP SPL3SMP_E', provider: 'NASA JPL / NSIDC', use: 'Humedad de suelo regional' },
  { name: 'VIIRS VNP13A1', provider: 'NASA LP DAAC', use: 'NDVI (vigor del cultivo)' },
  { name: 'GEOS-FP / Open-Meteo', provider: 'NASA GMAO / Open-Meteo', use: 'Pronóstico de 72 h' },
  { name: 'Cobertura vegetal 2022', provider: 'MAATE Ecuador', use: 'Límites de tierra agropecuaria' },
];

export default function DataSourcesModal({ onClose }: { onClose: () => void }) {
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
            <h2 id="sources-title" className="text-lg font-semibold">Fuentes de datos</h2>
            <p className="text-sm text-slate-500">ChAgro usa datos abiertos de la NASA y de Ecuador.</p>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Prototipo:</strong> por ahora los valores del visor son <em>simulados</em> con el mismo formato que
          entregará el pipeline real de datos NASA.
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="pb-2 pr-3">Producto</th>
              <th className="pb-2 pr-3">Proveedor</th>
              <th className="pb-2">Uso en ChAgro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SOURCES.map((s) => (
              <tr key={s.name}>
                <td className="py-2 pr-3 font-medium">{s.name}</td>
                <td className="py-2 pr-3 text-slate-600">{s.provider}</td>
                <td className="py-2 text-slate-600">{s.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
