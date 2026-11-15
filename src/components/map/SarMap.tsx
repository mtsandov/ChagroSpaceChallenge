import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CircleMarker, MapContainer, Pane, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { GripVertical } from 'lucide-react';
import type { Basin, SarParcelFeature, Selection, VirtualStation, WaterMaskCollection } from '../../types';
import SwipeClipper from './SwipeClipper';
import LayerControls, { type LayerState } from './LayerControls';
import MapLegend from './MapLegend';
import {
  ALERT_COLORS,
  ALERT_LABELS,
  STATUS_COLORS,
  TREND_LABELS,
  WATER_STYLE,
} from './mapStyles';

interface Props {
  basin: Basin;
  parcels: SarParcelFeature[];
  waterBaseline: WaterMaskCollection;
  waterCurrent: WaterMaskCollection;
  stations: VirtualStation[];
  selection: Selection;
  onSelect: (s: Selection) => void;
}

const toLatLngs = (ring: number[][]): LatLngExpression[] => ring.map(([lng, lat]) => [lat, lng]);

function FlyToBasin({ basin }: { basin: Basin }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(basin.center, basin.zoom, { duration: 1.2 });
  }, [map, basin]);
  return null;
}

export default function SarMap({ basin, parcels, waterBaseline, waterCurrent, stations, selection, onSelect }: Props) {
  const [layers, setLayers] = useState<LayerState>({
    waterMask: true,
    parcels: true,
    stations: true,
    compare: false,
  });
  const [ratio, setRatio] = useState(0.5);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const baseline = waterBaseline.features.filter((f) => f.properties.basin_id === basin.id);
  const current = waterCurrent.features.filter((f) => f.properties.basin_id === basin.id);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setRatio(Math.min(0.98, Math.max(0.02, (e.clientX - rect.left) / rect.width)));
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden"
      onPointerMove={onPointerMove}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      <MapContainer center={basin.center} zoom={basin.zoom} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
          maxZoom={18}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution="Labels &copy; Esri"
          maxZoom={18}
        />
        <FlyToBasin basin={basin} />

        {/* Escenas SAR: base (izquierda) y pase actual (derecha) */}
        <Pane name="sar-baseline" style={{ zIndex: 410 }}>
          {layers.waterMask &&
            layers.compare &&
            baseline.map((f, i) => (
              <Polygon key={`b-${i}`} positions={toLatLngs(f.geometry.coordinates[0])} pathOptions={WATER_STYLE.baseline} interactive={false} />
            ))}
        </Pane>
        <Pane name="sar-current" style={{ zIndex: 420 }}>
          {layers.waterMask &&
            current.map((f, i) => (
              <Polygon key={`c-${i}`} positions={toLatLngs(f.geometry.coordinates[0])} pathOptions={WATER_STYLE.current} interactive={false} />
            ))}
        </Pane>
        <SwipeClipper enabled={layers.compare} ratio={ratio} leftPane="sar-baseline" rightPane="sar-current" />

        {/* Parcelas */}
        <Pane name="parcels" style={{ zIndex: 430 }}>
          {layers.parcels &&
            parcels.map((f) => {
              const p = f.properties;
              const selected = selection?.kind === 'parcel' && selection.id === p.parcel_id;
              const color = STATUS_COLORS[p.status];
              return (
                <Polygon
                  key={p.parcel_id}
                  positions={toLatLngs(f.geometry.coordinates[0])}
                  pathOptions={{
                    color: selected ? '#ffffff' : color,
                    weight: selected ? 4 : 2,
                    fillColor: color,
                    fillOpacity: selected ? 0.25 : 0.12,
                  }}
                  eventHandlers={{ click: () => onSelect({ kind: 'parcel', id: p.parcel_id }) }}
                >
                  <Tooltip sticky pane="tooltipPane">{p.name}</Tooltip>
                  <Popup pane="popupPane">
                    <div className="min-w-[200px]">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="mb-2 text-[11px] text-slate-500">
                        {p.crop}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <dt className="text-slate-500">Área</dt>
                        <dd className="text-right font-medium">{p.area_hectares} ha</dd>
                        <dt className="text-slate-500">Con agua (SAR)</dt>
                        <dd className="text-right font-medium">
                          {p.irrigated_area_ha} ha ({p.irrigated_area_pct}%)
                        </dd>
                        <dt className="text-slate-500">Retrodispersión</dt>
                        <dd className="text-right font-medium">{p.sar_backscatter_db} dB</dd>
                        <dt className="text-slate-500">Δ vs base</dt>
                        <dd className="text-right font-medium">{p.sar_delta_db} dB</dd>
                        <dt className="text-slate-500">Humedad suelo</dt>
                        <dd className="text-right font-medium">{p.soil_moisture_m3m3} m³/m³</dd>
                        <dt className="text-slate-500">NDVI</dt>
                        <dd className="text-right font-medium">{p.ndvi}</dd>
                      </dl>
                      <div
                        className="mt-2 rounded px-2 py-1 text-center text-[11px] font-semibold text-white"
                        style={{ background: STATUS_COLORS[p.status] }}
                      >
                        {p.status_label}
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}
        </Pane>

        {/* Estaciones virtuales */}
        <Pane name="stations" style={{ zIndex: 440 }}>
          {layers.stations &&
            stations.map((s) => {
              const selected = selection?.kind === 'station' && selection.id === s.station_id;
              return (
                <CircleMarker
                  key={s.station_id}
                  center={[s.lat, s.lng]}
                  radius={selected ? 11 : 8}
                  pathOptions={{ color: '#ffffff', weight: 2, fillColor: ALERT_COLORS[s.alert_level], fillOpacity: 1 }}
                  eventHandlers={{ click: () => onSelect({ kind: 'station', id: s.station_id }) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} pane="tooltipPane">
                    {s.name}: {s.canal_level_pct}%
                  </Tooltip>
                  <Popup pane="popupPane">
                    <div className="min-w-[180px]">
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="mb-2 text-[11px] text-slate-500">Estación virtual · {s.station_id}</div>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold" style={{ color: ALERT_COLORS[s.alert_level] }}>
                          {s.canal_level_pct}%
                        </span>
                        <span className="text-xs text-slate-600">{TREND_LABELS[s.flow_trend]}</span>
                      </div>
                      <div className="mt-1 text-[11px]">
                        Estado: <strong>{ALERT_LABELS[s.alert_level]}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Actualizado {new Date(s.last_updated).toLocaleString('es-EC')}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </Pane>
      </MapContainer>

      {layers.compare && layers.waterMask && (
        <>
          <div className="swipe-divider" style={{ left: `${ratio * 100}%` }}>
            <div
              className="swipe-handle"
              role="slider"
              aria-label="Comparar escena base y actual"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ratio * 100)}
              tabIndex={0}
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setRatio((r) => Math.max(0.02, r - 0.05));
                if (e.key === 'ArrowRight') setRatio((r) => Math.min(0.98, r + 0.05));
              }}
            >
              <GripVertical size={18} className="text-slate-600" />
            </div>
          </div>
          <div className="pointer-events-none absolute left-3 top-3 z-[450] rounded-md bg-slate-900/75 px-2 py-1 text-[11px] font-medium text-white">
            Base seca · {parcels[0]?.properties.baseline_date}
          </div>
          <div
            className="pointer-events-none absolute top-3 z-[450] rounded-md bg-sky-700/85 px-2 py-1 text-[11px] font-medium text-white"
            style={{ left: `calc(${ratio * 100}% + 12px)` }}
          >
            Pase actual · {parcels[0]?.properties.observation_date}
          </div>
        </>
      )}

      <LayerControls value={layers} onChange={setLayers} />
      <MapLegend />
    </div>
  );
}
