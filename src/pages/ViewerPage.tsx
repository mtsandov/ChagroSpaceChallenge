import { useMemo, useState } from 'react';
import { BarChart3, Bot, Loader2, Map as MapIcon } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import SarMap from '../components/map/SarMap';
import KpiStrip from '../components/kpi/KpiStrip';
import CopilotDrawer from '../components/copilot/CopilotDrawer';
import { useViewerData } from '../lib/api/useViewerData';
import { summarizeBasin } from '../lib/summary';
import { useAuth } from '../context/AuthContext';
import { useFarmerParcels } from '../lib/farmerStore';
import { useI18n } from '../i18n';
import type { Role, Selection } from '../types';

type MobileTab = 'map' | 'data' | 'chat';

const TABS: { id: MobileTab; icon: typeof MapIcon }[] = [
  { id: 'map', icon: MapIcon },
  { id: 'data', icon: BarChart3 },
  { id: 'chat', icon: Bot },
];

const L = {
  es: { map: 'Mapa', data: 'Datos', chat: 'Copiloto', loading: '{s.loading}', error: 'Error cargando datos' },
  en: { map: 'Map', data: 'Data', chat: 'Copilot', loading: 'Loading satellite data…', error: 'Error loading data' },
};

export default function ViewerPage() {
  const { data, error } = useViewerData();
  const { user } = useAuth();
  const { lang, zone } = useI18n();
  const s = L[lang];
  const [basinId, setBasinId] = useState('daule');
  const [selection, setSelection] = useState<Selection>(null);
  const mode: Role = user?.role === 'farmer' ? 'farmer' : 'public';
  const [passDate, setPassDate] = useState<string | null>(null);
  const [tab, setTab] = useState<MobileTab>('map');
  const { parcels: myParcels } = useFarmerParcels(user?.role === 'farmer' ? user.id : undefined);


  const basin = data?.basins.find((b) => b.id === basinId) ?? data?.basins[0];

  const summary = useMemo(
    () => (data && basin ? summarizeBasin(basin, data.weather[basin.id], data.parcels) : null),
    [data, basin],
  );

  const parcels = useMemo(
    () => data?.parcels.features.filter((f) => f.properties.basin_id === basin?.id) ?? [],
    [data, basin],
  );

  const selectionLabel = useMemo(() => {
    if (!selection || !data) return null;
    const name = data.parcels.features.find((f) => f.properties.parcel_id === selection.id)?.properties.name;
    return name ? zone(name) : null;
  }, [selection, data, zone]);

  const changeBasin = (id: string) => {
    setBasinId(id);
    setSelection(null);
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <TopNav basins={data?.basins} basinId={basinId} onBasinChange={changeBasin} />

      {error && <div className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{s.error}: {error}</div>}

      {!data || !basin || !summary ? (
        !error && (
          <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={20} /> Cargando datos satelitales…
          </div>
        )
      ) : (
        <main className="relative min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,65fr)_minmax(340px,35fr)]">
          <section className="absolute inset-0 flex min-h-0 flex-col lg:static">
            <div className={`relative min-h-0 flex-1 ${tab === 'map' ? '' : 'invisible lg:visible'}`}>
              <SarMap
                basin={basin}
                parcels={parcels}
                waterBaseline={data.waterBaseline}
                waterCurrent={data.waterCurrent}
                waterTimeline={data.waterTimeline}
                timeline={data.timeline}
                hvImages={data.hvImages}
                farmerParcels={myParcels.filter((p) => p.basin_id === basin.id)}
                onDateChange={setPassDate}
                selection={selection}
                onSelect={setSelection}
              />
            </div>
            <div
              className={`absolute inset-0 overflow-y-auto bg-slate-100 lg:static lg:overflow-visible ${tab === 'data' ? '' : 'hidden lg:block'}`}
            >
              <KpiStrip summary={summary} passDate={passDate} timeline={data.timeline[basin.id]} zones={parcels} />
            </div>
          </section>
          <div className={`absolute inset-0 min-h-0 border-slate-200 lg:static lg:border-l ${tab === 'chat' ? '' : 'hidden lg:block'}`}>
            <CopilotDrawer
              mode={mode}
              basinId={basin.id}
              basinName={basin.short_name}
              selection={selection}
              selectionLabel={selectionLabel}
              passDate={passDate}
              data={data}
              farmerParcel={mode === 'farmer' ? (myParcels.find((p) => p.basin_id === basin.id) ?? myParcels[0] ?? null) : null}
            />
          </div>
        </main>
      )}

      {data && basin && summary && (
        <nav className="grid shrink-0 grid-cols-3 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${tab === t.id ? 'text-brand-700' : 'text-slate-500'}`}
            >
              <t.icon size={20} />
              {s[t.id]}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
