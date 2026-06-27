'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import type { DamageLevel } from '@/components/atoms/damage-level-badge';

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

export interface DamageMapFeature {
  id: string;
  type: string;
  damageLevel: DamageLevel;
  trappedPersonsEstimate?: number | null;
  publishNote?: string | null;
  photoUrl?: string | null;
  lat: number;
  lng: number;
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
  /** Optional damage layer features — rendered as separate markers */
  damageFeatures?: DamageMapFeature[];
  /** Whether the damage layer is currently visible (controlled by parent) */
  damageLayerVisible?: boolean;
}

// ── Damage marker icons ───────────────────────────────────────────────────────
const DAMAGE_ICONS: Record<DamageLevel, L.Icon> = {
  collapsed: L.icon({
    iconUrl: `${BASE}/marker-icon-2x-red.png`,
    iconRetinaUrl: `${BASE}/marker-icon-2x-red.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  severe: L.icon({
    iconUrl: `${BASE}/marker-icon-2x-orange.png`,
    iconRetinaUrl: `${BASE}/marker-icon-2x-orange.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  moderate: L.icon({
    iconUrl: `${BASE}/marker-icon-2x-gold.png`,
    iconRetinaUrl: `${BASE}/marker-icon-2x-gold.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
};

const DAMAGE_LEVEL_LABELS: Record<DamageLevel, string> = {
  collapsed: '🔴 Colapsada',
  severe: '🟠 Daño grave',
  moderate: '🟡 Daño moderado',
};

const API_BASE_MAP = (
  typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL ?? '') : ''
).replace(/\/$/, '');

// ── Inner component that renders damage markers inside MapContainer ────────────
function DamageMarkersLayer({ features }: { features: DamageMapFeature[] }) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (groupRef.current === null) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    for (const f of features) {
      const icon = DAMAGE_ICONS[f.damageLevel] ?? DAMAGE_ICONS.moderate;
      const trapped =
        f.trappedPersonsEstimate != null && f.trappedPersonsEstimate > 0
          ? `<br/><span>🧍 ${f.trappedPersonsEstimate} atrapados</span>`
          : f.type === 'trapped_persons'
            ? '<br/><span>🧍 Atrapados: desconocido</span>'
            : '';

      const noteHtml =
        f.publishNote != null && f.publishNote.trim().length > 0
          ? `<br/><em style="font-size:11px;color:#555;">${f.publishNote}</em>`
          : '';

      const photoHtml =
        f.photoUrl != null && f.photoUrl.trim().length > 0
          ? (() => {
              const src = f.photoUrl.startsWith('http')
                ? f.photoUrl
                : f.photoUrl.startsWith('/')
                  ? `${API_BASE_MAP}${f.photoUrl}`
                  : `${API_BASE_MAP}/files/${f.photoUrl}`;
              return `<br/><img src="${src}" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:4px;margin-top:4px;" loading="lazy"/>`;
            })()
          : '';

      L.marker([f.lat, f.lng], { icon })
        .bindPopup(
          `<strong>${DAMAGE_LEVEL_LABELS[f.damageLevel]}</strong>${trapped}${noteHtml}${photoHtml}`,
        )
        .addTo(group);
    }

    return () => {
      group.clearLayers();
    };
  }, [map, features]);

  return null;
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
export default function EmergencyMap({
  points,
  damageFeatures = [],
  damageLayerVisible = false,
}: EmergencyMapProps) {
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

        {/* Damage layer — only rendered when toggle is on */}
        {damageLayerVisible && damageFeatures.length > 0 && (
          <DamageMarkersLayer features={damageFeatures} />
        )}
      </MapContainer>

      {/* Empty-state overlay rendered on top of the map */}
      {points.length === 0 && damageFeatures.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1000] pointer-events-none">
          <p className="text-sm font-medium text-gray-500">
            Aún no hay ubicaciones en el mapa.
          </p>
        </div>
      )}
    </div>
  );
}
