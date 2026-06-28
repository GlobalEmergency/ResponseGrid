'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { MapPoint } from './emergency-map';
import { createResponseGridClient } from '@reliefhub/api-client';

// Leaflet must only run in the browser — dynamic with ssr:false is only
// valid inside a Client Component (Server Components forbid it in Next 16).
const EmergencyMap = dynamic(() => import('./emergency-map'), { ssr: false });

interface EmergencyMapWrapperProps {
  points: MapPoint[];
  /** If provided, fetch all resource points client-side for this emergency */
  emergencyId?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const MAP_FETCH_LIMIT = 100;

export function EmergencyMapWrapper({ points, emergencyId }: EmergencyMapWrapperProps) {
  // ── All-resource points for the map (paginated fetch, independent of list) ──
  // `points` prop contains SSR-fetched needs (all) + page-1 resources (50 max).
  // We re-fetch ALL resource points here (limit=100 per page, loop until done)
  // and merge them with the needs already in `points`.
  // While fetching, the map shows the initial SSR points so it's never blank.
  const needPoints = points.filter((p) => p.kind === 'need');
  // Keep a ref always pointing at the current needPoints so the fetch effect
  // can read the latest value without being re-triggered on every render.
  const needPointsRef = useRef<MapPoint[]>(needPoints);
  useLayoutEffect(() => {
    needPointsRef.current = needPoints;
  });

  const [allMapPoints, setAllMapPoints] = useState<MapPoint[]>(points);

  useEffect(() => {
    if (emergencyId === undefined || emergencyId === '') return;

    let cancelled = false;

    async function fetchAllResourcePoints() {
      const client = createResponseGridClient(API_BASE);
      const accumulated: MapPoint[] = [];
      let page = 1;
      let total = Infinity;

      while (accumulated.length < total) {
        try {
          const { data } = await client.GET(
            '/emergencies/{emergencyId}/public/resources',
            {
              params: {
                path: { emergencyId: emergencyId as string },
                query: { page, limit: MAP_FETCH_LIMIT },
              },
            },
          );

          if (cancelled) return;
          if (data == null) break;

          total = data.total;

          for (const r of data.items) {
            if (r.location.latitude === 0 && r.location.longitude === 0) continue;
            accumulated.push({
              id: r.id,
              lat: r.location.latitude,
              lng: r.location.longitude,
              label: r.name,
              kind: 'resource',
              status: r.publicStatus,
              resourceType: r.type,
              city: r.city,
              country: r.country,
              accepts: r.accepts,
            });
          }

          if (data.items.length === 0) break;
          page += 1;
        } catch (err) {
          console.error('[EmergencyMapWrapper] resource fetch error (page', page, '):', err);
          break;
        }
      }

      if (!cancelled) {
        // Merge all resource points with the CURRENT need points (via ref so we
        // always pick up the latest value even if the prop changed since the
        // effect first fired).
        setAllMapPoints([...accumulated, ...needPointsRef.current]);
      }
    }

    void fetchAllResourcePoints();
    return () => {
      cancelled = true;
    };
    // needPointsRef is stable; intentionally depend only on emergencyId so we
    // fetch once per emergency, not on every parent re-render.
  }, [emergencyId]);

  return <EmergencyMap points={allMapPoints} />;
}
