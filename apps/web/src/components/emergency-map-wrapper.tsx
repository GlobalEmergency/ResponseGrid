'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import type { MapPoint, DamageMapFeature } from './emergency-map';
import type { DamageLevel } from '@/components/atoms/damage-level-badge';

// Leaflet must only run in the browser — dynamic with ssr:false is only
// valid inside a Client Component (Server Components forbid it in Next 16).
const EmergencyMap = dynamic(() => import('./emergency-map'), { ssr: false });

interface EmergencyMapWrapperProps {
  points: MapPoint[];
  /** If provided, fetch and display the damage layer for this emergency */
  emergencyId?: string;
}

const VALID_DAMAGE_LEVELS: DamageLevel[] = ['collapsed', 'severe', 'moderate'];

function isDamageLevel(v: unknown): v is DamageLevel {
  return typeof v === 'string' && (VALID_DAMAGE_LEVELS as string[]).includes(v);
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

interface GeoJsonGeometry {
  type: string;
  coordinates: [number, number];
}

interface GeoJsonProperties {
  id: string;
  type: string;
  damageLevel: string;
  trappedPersonsEstimate?: number | null;
  publishNote?: string | null;
  photoUrls?: string[] | null;
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
  properties: GeoJsonProperties;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export function EmergencyMapWrapper({ points, emergencyId }: EmergencyMapWrapperProps) {
  const [damageFeatures, setDamageFeatures] = useState<DamageMapFeature[]>([]);
  const [damageVisible, setDamageVisible] = useState(false);

  useEffect(() => {
    if (emergencyId === undefined || emergencyId === '') return;

    let cancelled = false;

    async function fetchDamageLayer() {
      try {
        const res = await fetch(
          `${API_BASE}/emergencies/${emergencyId}/reports/damage-layer`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;

        const data: unknown = await res.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          (data as Record<string, unknown>).type !== 'FeatureCollection' ||
          !Array.isArray((data as Record<string, unknown>).features)
        ) {
          return;
        }

        const collection = data as GeoJsonFeatureCollection;
        const parsed: DamageMapFeature[] = [];

        for (const feature of collection.features) {
          if (
            feature.geometry === null ||
            !Array.isArray(feature.geometry.coordinates) ||
            feature.geometry.coordinates.length < 2
          ) {
            continue;
          }

          const props = feature.properties;
          if (!isDamageLevel(props.damageLevel)) continue;

          const [lng, lat] = feature.geometry.coordinates;
          if (typeof lat !== 'number' || typeof lng !== 'number') continue;

          const photoUrls = props.photoUrls;
          const photoUrl =
            Array.isArray(photoUrls) && photoUrls.length > 0
              ? (typeof photoUrls[0] === 'string' ? photoUrls[0] : null)
              : null;

          parsed.push({
            id: props.id,
            type: props.type,
            damageLevel: props.damageLevel,
            trappedPersonsEstimate: props.trappedPersonsEstimate ?? null,
            publishNote: props.publishNote ?? null,
            photoUrl,
            lat,
            lng,
          });
        }

        if (!cancelled) {
          setDamageFeatures(parsed);
          // Auto-show when there are trapped_persons features
          const hasTrapped = parsed.some((f) => f.type === 'trapped_persons');
          setDamageVisible(hasTrapped);
        }
      } catch {
        // Silent — damage layer is optional
      }
    }

    void fetchDamageLayer();
    return () => {
      cancelled = true;
    };
  }, [emergencyId]);

  const hasDamageFeatures = damageFeatures.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Damage layer toggle — only shown when there are published damage reports */}
      {hasDamageFeatures && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setDamageVisible((v) => !v)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
              damageVisible
                ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                : 'border-red-600 bg-white text-red-700 hover:bg-red-50',
            ].join(' ')}
            aria-pressed={damageVisible}
          >
            <span aria-hidden="true">🏚</span>
            {damageVisible ? 'Ocultar daños' : 'Mostrar daños estructurales'}
            <span className="rounded-full bg-current/20 px-1.5 text-xs font-bold">
              {damageFeatures.length}
            </span>
          </button>
          {damageVisible && (
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" aria-hidden="true" />
                Colapsada
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500" aria-hidden="true" />
                Daño grave
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                Daño moderado
              </span>
            </div>
          )}
        </div>
      )}

      <EmergencyMap
        points={points}
        damageFeatures={damageFeatures}
        damageLayerVisible={damageVisible}
      />
    </div>
  );
}
