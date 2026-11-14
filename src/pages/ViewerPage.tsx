import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import SarMap from '../components/map/SarMap';
import KpiStrip from '../components/kpi/KpiStrip';
import CopilotDrawer from '../components/copilot/CopilotDrawer';
import { useViewerData } from '../lib/api/useViewerData';
import { summarizeBasin } from '../lib/summary';
import { useAuth } from '../context/AuthContext';
import type { Role, Selection } from '../types';

export default function ViewerPage() {
  const { data, error } = useViewerData();
  const { user } = useAuth();
  const [basinId, setBasinId] = useState('daule');
  const [selection, setSelection] = useState<Selection>(null);
  const [mode, setMode] = useState<Role>('public');

  // Los agricultores entran por defecto en modo agricultor; el público siempre en modo comunidad
  useEffect(() => {
    setMode(user?.role === 'farmer' ? 'farmer' : 'public');
  }, [user]);

  const basin = data?.basins.find((b) => b.id === basinId) ?? data?.basins[0];

  const summary = useMemo(
    () => (data && basin ? summarizeBasin(basin, data.weather[basin.id], data.parcels, data.stations) : null),
    [data, basin],
  );

  const parcels = useMemo(
    () => data?.parcels.features.filter((f) => f.properties.basin_id === basin?.id) ?? [],
    [data, basin],
  );
  const stations = useMemo(() => data?.stations.filter((s) => s.basin_id === basin?.id) ?? [], [data, basin]);

  const selectionLabel = useMemo(() => {
    if (!selection || !data) return null;
    if (selection.kind === 'parcel') return data.parcels.features.find((f) => f.properties.parcel_id === selection.id)?.properties.name ?? null;
    return data.stations.find((s) => s.station_id === selection.id)?.name ?? null;
  }, [selection, data]);

  const changeBasin = (id: string) => {
    setBasinId(id);
    setSelection(null);
  };

  return (
    <div className="flex h-full flex-col lg:h-screen lg:overflow-hidden">
      <TopNav basins={data?.basins} basinId={basinId} onBasinChange={changeBasin} mode={mode} onModeChange={setMode} />

      {error && <div className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">Error cargando datos: {error}</div>}

      {!data || !basin || !summary ? (
        !error && (
          <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={20} /> Cargando datos satelitales…
          </div>
        )
      ) : (
        <main className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,65fr)_minmax(340px,35fr)]">
          <section className="flex min-h-0 flex-col">
            <div className="relative h-[60vh] min-h-[360px] lg:h-auto lg:flex-1">
              <SarMap
                basin={basin}
                parcels={parcels}
                waterBaseline={data.waterBaseline}
                waterCurrent={data.waterCurrent}
                stations={stations}
                selection={selection}
                onSelect={setSelection}
              />
            </div>
            <KpiStrip summary={summary} />
          </section>
          <div className="h-[75vh] min-h-0 border-l border-slate-200 lg:h-auto">
            <CopilotDrawer
              mode={mode}
              basinId={basin.id}
              basinName={basin.short_name}
              selection={selection}
              selectionLabel={selectionLabel}
            />
          </div>
        </main>
      )}
    </div>
  );
}
