'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';

// ── Icon helpers ───────────────────────────────────────────────────────────────
// Uses the pointhi/leaflet-color-markers CDN so bundlers never break icon URLs.
const BASE =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img';

type MarkerColor = 'blue' | 'red' | 'green' | 'gold' | 'orange';

function makeIcon(color: MarkerColor): L.Icon {
  return L.icon({
    iconUrl: `${BASE}/marker-icon-2x-${color}.png`,
    // pointhi repo only ships 2x; we use it for both 1x and 2x
    iconRetinaUrl: `${BASE}/marker-icon-2x-${color}.png`,
    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const ICONS: Record<MarkerColor, L.Icon> = {
  green: makeIcon('green'),
  gold: makeIcon('gold'),
  orange: makeIcon('orange'),
  blue: makeIcon('blue'),
  red: makeIcon('red'),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type ResourcePublicStatus = 'active' | 'saturated' | 'paused' | 'closed' | 'hidden';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: 'resource' | 'need';
  /** Only meaningful for kind === 'resource'. Controls marker colour. */
  status?: ResourcePublicStatus;
}

function resourceIcon(status: ResourcePublicStatus | undefined): L.Icon {
  switch (status) {
    case 'active':
      return ICONS.green;
    case 'saturated':
      return ICONS.gold;
    case 'paused':
      return ICONS.orange;
    case 'closed':
    case 'hidden':
    default:
      return ICONS.blue;
  }
}

interface EmergencyMapProps {
  points: MapPoint[];
}

// ── Inner component that fits the bounds once the map is ready ────────────────
function BoundsFitter({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      const p = points[0];
      if (p !== undefined) {
        map.setView([p.lat, p.lng], 13);
      }
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmergencyMap({ points }: EmergencyMapProps) {
  // Default centre (Spain) used only when there are no points
  const defaultCenter: [number, number] = [40.4168, -3.7038];
  const defaultZoom = 5;

  return (
    <div className="relative w-full h-80 rounded-lg overflow-hidden border-2 border-gray-200">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <BoundsFitter points={points} />

        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={point.kind === 'resource' ? resourceIcon(point.status) : ICONS.red}
          >
            <Popup>
              <strong>{point.label}</strong>
              <br />
              <span className="text-xs text-gray-500">
                {point.kind === 'resource' ? 'Recurso' : 'Petición'}
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Empty-state overlay rendered on top of the map */}
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1000] pointer-events-none">
          <p className="text-sm font-medium text-gray-500">
            Aún no hay ubicaciones en el mapa.
          </p>
        </div>
      )}
    </div>
  );
}
