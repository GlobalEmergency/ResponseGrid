'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';

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
  /**
   * F09 — When true the coordinates are approximate (±300 m jitter applied
   * by the backend). An uncertainty circle is drawn around the marker.
   * Only meaningful for kind === 'need'. Resources are always 'public'.
   */
  approximate?: boolean;
  /** Rich popup fields — only present for kind === 'resource' (Task 8) */
  resourceType?: string;
  city?: string | null;
  country?: string | null;
  accepts?: string[];
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

// ── Inner component that draws uncertainty circles for approximate needs ──────
const APPROX_RADIUS_METERS = 300;
const APPROX_CIRCLE_OPTIONS: L.CircleOptions = {
  radius: APPROX_RADIUS_METERS,
  color: '#ef4444',       // red-500 — matches the need marker colour
  fillColor: '#ef4444',
  fillOpacity: 0.08,
  weight: 1,
  opacity: 0.35,
  interactive: false,
};

function ApproximateCirclesLayer({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  const approximatePoints = points.filter(
    (p) => p.kind === 'need' && p.approximate === true,
  );

  useEffect(() => {
    if (groupRef.current === null) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    for (const p of approximatePoints) {
      L.circle([p.lat, p.lng], APPROX_CIRCLE_OPTIONS).addTo(group);
    }

    return () => {
      group.clearLayers();
    };
  // approximatePoints is derived — we depend on points identity instead
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points]);

  return null;
}

// ── XSS helper ───────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Inner component that renders clustered resource/need markers ──────────────
function ClusteredMarkersLayer({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // Create the cluster group once and keep it alive.
    // L.markerClusterGroup is injected by the 'leaflet.markercluster' side-effect import.
    if (clusterRef.current === null) {
      clusterRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
      });
      clusterRef.current.addTo(map);
    }

    const group = clusterRef.current;
    group.clearLayers();

    for (const point of points) {
      const icon =
        point.kind === 'resource' ? resourceIcon(point.status) : ICONS.red;

      // Build rich popup HTML — all free-text values are escaped to prevent XSS
      const kindLabel = point.kind === 'resource' ? 'Recurso' : 'Petición';
      const typeLabel =
        point.resourceType != null && point.resourceType !== ''
          ? `<br/><span style="font-size:11px;color:#555;">${escapeHtml(point.resourceType)}</span>`
          : '';
      const locationParts: string[] = [];
      if (point.city != null && point.city !== '') locationParts.push(escapeHtml(point.city));
      if (point.country != null && point.country !== '') locationParts.push(escapeHtml(point.country));
      const locationLabel =
        locationParts.length > 0
          ? `<br/><span style="font-size:11px;color:#555;">${locationParts.join(', ')}</span>`
          : '';
      const acceptsLabel =
        point.accepts != null && point.accepts.length > 0
          ? `<br/><span style="font-size:11px;color:#555;">Acepta: ${point.accepts.map(escapeHtml).join(', ')}</span>`
          : '';
      const approximateLabel =
        point.kind === 'need' && point.approximate === true
          ? '<br/><span style="font-size:11px;color:#b45309;">📍 Ubicación aproximada</span>'
          : '';

      const popupHtml = `<strong>${escapeHtml(point.label)}</strong><br/><span style="font-size:11px;color:#6b7280;">${kindLabel}</span>${typeLabel}${locationLabel}${acceptsLabel}${approximateLabel}`;

      L.marker([point.lat, point.lng], { icon })
        .bindPopup(popupHtml)
        .addTo(group);
    }

    return () => {
      group.clearLayers();
    };
  }, [map, points]);

  // Remove the cluster group when the component unmounts.
  // Read clusterRef.current INSIDE the cleanup so we always get the value
  // set by the other effect, not the null captured at registration time.
  useEffect(() => {
    return () => {
      if (clusterRef.current !== null) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
    // Only on unmount
  }, [map]);

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
        <ApproximateCirclesLayer points={points} />
        <ClusteredMarkersLayer points={points} />
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
