import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import SarMap from '../components/map/SarMap';
import KpiStrip from '../components/kpi/KpiStrip';
import CopilotDrawer from '../components/copilot/CopilotDrawer';
import { useViewerData } from '../lib/api/useViewerData';
import { summarizeBasin } from '../lib/summary';
import { useAuth } from '../context/AuthContext';
import { useFarmerParcels } from '../lib/farmerStore';
import type { Role, Selection } from '../types';

export default function ViewerPage() {
  const { data, error } = useViewerData();
  const { user } = useAuth();
  const [basinId, setBasinId] = useState('daule');
  const [selection, setSelection] = useState<Selection>(null);
  const mode: Role = user?.role === 'farmer' ? 'farmer' : 'public';
  const [passDate, setPassDate] = useState<string | null>(null);
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
    return data.parcels.features.find((f) => f.properties.parcel_id === selection.id)?.properties.name ?? null;
  }, [selection, data]);

  const changeBasin = (id: string) => {
    setBasinId(id);
    setSelection(null);
  };

  return (
    <div className="flex h-full flex-col lg:h-screen lg:overflow-hidden">
      <TopNav basins={data?.basins} basinId={basinId} onBasinChange={changeBasin} />

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
                waterTimeline={data.waterTimeline}
                timeline={data.timeline}
                hvImages={data.hvImages}
                farmerParcels={myParcels.filter((p) => p.basin_id === basin.id)}
                onDateChange={setPassDate}
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
              passDate={passDate}
              data={data}
              farmerParcel={mode === 'farmer' ? (myParcels.find((p) => p.basin_id === basin.id) ?? myParcels[0] ?? null) : null}
            />
          </div>
        </main>
      )}
    </div>
  );
}
