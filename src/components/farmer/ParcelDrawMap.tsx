import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Eraser, Undo2 } from 'lucide-react';

type LatLng = [number, number];

export function polygonAreaHa(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const lat0 = (points.reduce((s, p) => s + p[0], 0) / points.length) * (Math.PI / 180);
  const xy = points.map(([lat, lng]) => [lng * 111_320 * Math.cos(lat0), lat * 110_540]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2 / 10_000;
}

export const polygonCenter = (points: LatLng[]): LatLng => [
  points.reduce((s, p) => s + p[0], 0) / points.length,
  points.reduce((s, p) => s + p[1], 0) / points.length,
];

function ClickCapture({ onAdd }: { onAdd: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onAdd([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]) });
  return null;
}

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [map, center]);
  return null;
}

interface Props {
  center: LatLng;
  points: LatLng[];
  onChange: (points: LatLng[]) => void;
}

export default function ParcelDrawMap({ center, points, onChange }: Props) {
  const area = polygonAreaHa(points);
  return (
    <div>
      <div className="relative h-72 overflow-hidden rounded-lg border border-slate-200">
        <MapContainer center={center} zoom={14} className="h-full w-full cursor-crosshair" doubleClickZoom={false}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
            maxZoom={18}
          />
          <Recenter center={center} />
          <ClickCapture onAdd={(p) => onChange([...points, p])} />
          {points.length >= 3 ? (
            <Polygon positions={points} pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#22c55e', fillOpacity: 0.3 }} />
          ) : (
            points.length === 2 && <Polyline positions={points} pathOptions={{ color: '#ffffff', weight: 2.5, dashArray: '6 4' }} />
          )}
          {points.map((p, i) => (
            <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }} />
          ))}
        </MapContainer>
        <div className="pointer-events-none absolute left-2 top-2 z-[500] rounded-md bg-slate-900/75 px-2 py-1 text-[11px] text-white">
          {points.length < 3 ? `Haz clic en cada esquina de la parcela (${points.length}/3 mínimo)` : `${points.length} puntos · ${area.toFixed(2)} ha`}
        </div>
        <div className="absolute right-2 top-2 z-[500] flex gap-1">
          <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={points.length === 0} onClick={() => onChange(points.slice(0, -1))}>
            <Undo2 size={13} /> Deshacer
          </button>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={points.length === 0} onClick={() => onChange([])}>
            <Eraser size={13} /> Borrar
          </button>
        </div>
      </div>
    </div>
  );
}
