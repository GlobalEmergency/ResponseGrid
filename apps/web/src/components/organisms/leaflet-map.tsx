'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

// Fix Leaflet's default icon broken by bundlers that don't resolve the asset
// URLs in leaflet.css. We point directly at the unpkg CDN copies.
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  address: string;
}

export default function LeafletMap({
  latitude,
  longitude,
  address,
}: LeafletMapProps) {
  const position: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      key={`${latitude},${longitude}`}
      center={position}
      zoom={14}
      style={{ height: '220px', width: '100%', borderRadius: '0.5rem' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position} icon={defaultIcon} title={address} />
    </MapContainer>
  );
}
