import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, ImageOverlay, MapContainer, Pane, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { Basin, FarmerParcel, HvImages, SarParcelFeature, SarTimeline, Selection, WaterMaskCollection } from '../../types';
import LayerControls, { type LayerState } from './LayerControls';
import MapLegend from './MapLegend';
import ZonePopup from './ZonePopup';
import { assetUrl } from '../../lib/api/client';
import { useI18n } from '../../i18n';
import TimeSlider from './TimeSlider';
import {
  STATUS_COLORS,
  vigorColor,
  WATER_STYLE,
} from './mapStyles';

interface Props {
  basin: Basin;
  parcels: SarParcelFeature[];
  waterBaseline: WaterMaskCollection;
  waterCurrent: WaterMaskCollection;
  waterTimeline: WaterMaskCollection;
  timeline: SarTimeline;
  hvImages: HvImages;
  farmerParcels: FarmerParcel[];
  onDateChange: (date: string | null) => void;
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

export default function SarMap({ basin, parcels, waterBaseline, waterCurrent, waterTimeline, timeline, hvImages, farmerParcels, onDateChange, selection, onSelect }: Props) {
  const [layers, setLayers] = useState<LayerState>({
    waterMask: true,
    parcels: true,
    colorBy: 'status',
  });
  const { lang, zone } = useI18n();
  const analysisDate = parcels[0]?.properties.observation_date;

  const frames = useMemo(() => {
    const own = waterTimeline.features.filter((f) => f.properties.basin_id === basin.id);
    const dates = timeline[basin.id]?.dates ?? [];
    if (dates.length > 0) return dates.map((date) => ({ date, features: own.filter((f) => f.properties.date === date) }));
    const byBasin = (c: WaterMaskCollection) => c.features.filter((f) => f.properties.basin_id === basin.id);
    return [
      { date: parcels[0]?.properties.baseline_date ?? '', features: byBasin(waterBaseline) },
      { date: analysisDate ?? '', features: byBasin(waterCurrent) },
    ].filter((f) => f.date);
  }, [basin.id, timeline, waterTimeline, waterBaseline, waterCurrent, parcels, analysisDate]);

  const [frameIdx, setFrameIdx] = useState(0);
  useEffect(() => {
    const i = frames.findIndex((f) => f.date === analysisDate);
    setFrameIdx(i >= 0 ? i : frames.length - 1);
  }, [frames, analysisDate]);
  const frame = frames[frameIdx];
  useEffect(() => {
    onDateChange(frame?.date ?? null);
  }, [frame?.date, onDateChange]);
  const basinTimeline = timeline[basin.id];
  const conditions = frame ? basinTimeline?.conditions?.[frame.date] : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden">
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

        <Pane name="hv" style={{ zIndex: 415 }}>
          {layers.colorBy === 'vigor' &&
            Object.entries(hvImages[basin.id] ?? {}).map(([date, img]) => (
              <ImageOverlay key={date} url={assetUrl(img.url)} bounds={img.bounds} opacity={date === frame?.date ? 0.9 : 0} interactive={false} />
            ))}
        </Pane>

        <Pane name="sar-water" style={{ zIndex: 420 }}>
          {layers.waterMask &&
            frame?.features.map((f, i) => (
              <Polygon key={`${frame.date}-${i}`} positions={toLatLngs(f.geometry.coordinates[0])} pathOptions={WATER_STYLE} interactive={false} />
            ))}
        </Pane>

        {/* Parcelas */}
        <Pane name="parcels" style={{ zIndex: 430 }}>
          {layers.parcels &&
            parcels.map((f) => {
              const p = f.properties;
              const selected = selection?.kind === 'parcel' && selection.id === p.parcel_id;
              const points = basinTimeline?.zones[p.parcel_id] ?? [];
              const point = points.find((x) => x.date === frame?.date);
              const ndvi = point?.ndvi ?? p.ndvi;
              const vigor = layers.colorBy === 'vigor';
              const color = vigor ? vigorColor(ndvi) : STATUS_COLORS[point?.status ?? p.status];
              return (
                <Polygon
                  key={p.parcel_id}
                  positions={toLatLngs(f.geometry.coordinates[0])}
                  pathOptions={{
                    color: selected ? '#ffffff' : color,
                    weight: selected ? 4 : vigor ? 3 : 2,
                    fillColor: color,
                    fillOpacity: vigor ? 0.05 : selected ? 0.25 : 0.12,
                    dashArray: p.zone_type === 'community' ? '6 4' : undefined,
                  }}
                  eventHandlers={{ click: () => onSelect({ kind: 'parcel', id: p.parcel_id }) }}
                >
                  <Tooltip sticky pane="tooltipPane">{zone(p.name)}</Tooltip>
                  <Popup pane="popupPane" minWidth={250}>
                    <ZonePopup
                      p={p}
                      date={frame?.date}
                      point={point}
                      points={points}
                      conditions={conditions}
                      referenceDate={basinTimeline?.reference_date}
                      climatologyPeriod={basinTimeline?.climatology_period}
                    />
                  </Popup>
                </Polygon>
              );
            })}
        </Pane>
        <Pane name="my-parcels" style={{ zIndex: 435 }}>
          {farmerParcels.map((fp) => {
            const style = { color: '#ffffff', weight: 2.5, dashArray: '6 4', fillColor: '#ffffff', fillOpacity: 0.15 };
            const label = (
              <Tooltip sticky pane="tooltipPane">
                {lang === 'en' ? 'My parcel' : 'Mi parcela'} · {fp.name} ({fp.area_ha} ha)
              </Tooltip>
            );
            return fp.polygon && fp.polygon.length >= 3 ? (
              <Polygon key={fp.id} positions={fp.polygon} pathOptions={style}>
                {label}
              </Polygon>
            ) : (
              <CircleMarker key={fp.id} center={fp.center} radius={7} pathOptions={{ ...style, dashArray: undefined, fillOpacity: 0.6 }}>
                {label}
              </CircleMarker>
            );
          })}
        </Pane>
      </MapContainer>

      <TimeSlider
        dates={frames.map((f) => f.date)}
        index={frameIdx}
        analysisDate={analysisDate}
        unreliable={frames.filter((f) => basinTimeline?.conditions?.[f.date]?.reliable === false).map((f) => f.date)}
        onChange={setFrameIdx}
      />
      <LayerControls value={layers} onChange={setLayers} />
      <MapLegend colorBy={layers.colorBy} date={frame?.date} showWater={layers.waterMask} />
    </div>
  );
}
