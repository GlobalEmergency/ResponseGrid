'use client';

import dynamic from 'next/dynamic';
import { useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react';
import type { MapPoint } from './emergency-map';
import { createResponseGridClient } from '@reliefhub/api-client';
import type { Map as LeafletMap } from 'leaflet';

// Leaflet must only run in the browser — dynamic with ssr:false is only
// valid inside a Client Component (Server Components forbid it in Next 16).
const EmergencyMap = dynamic(() => import('./emergency-map'), { ssr: false });

interface EmergencyMapWrapperProps {
  points: MapPoint[];
  /** If provided, fetch resource points client-side for this emergency using bounding-box queries */
  emergencyId?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const DEBOUNCE_MS = 400;

/**
 * Debounce a function call, returning a cancel() method.
 * Created at module level (outside any component) so linters do not
 * inspect it for ref usage.
 */
function createDebounced(fn: (map: LeafletMap) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const invoke = (map: LeafletMap) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(map);
    }, DEBOUNCE_MS);
  };
  invoke.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return invoke;
}

export function EmergencyMapWrapper({ points, emergencyId }: EmergencyMapWrapperProps) {
  // Need points come from the SSR-fetched prop and are kept separately so
  // we can merge them with whatever the map viewport currently returns.
  const needPoints = points.filter((p) => p.kind === 'need');
  const needPointsRef = useRef<MapPoint[]>(needPoints);
  useLayoutEffect(() => {
    needPointsRef.current = needPoints;
  });

  // allMapPoints drives what the map renders. Initially = SSR prop.
  const [allMapPoints, setAllMapPoints] = useState<MapPoint[]>(points);

  // Guard against stale in-flight requests: only the latest fetch wins.
  const fetchIdRef = useRef(0);

  const emergencyIdRef = useRef(emergencyId);
  useEffect(() => {
    emergencyIdRef.current = emergencyId;
  }, [emergencyId]);

  // fetchForBounds is defined as a stable useCallback so it can be listed as
  // a dep in handleMapReady. The actual work reads from refs (emergencyIdRef,
  // fetchIdRef, needPointsRef) so it never goes stale between renders.
  const fetchForBounds = useCallback(async (map: LeafletMap) => {
    const eid = emergencyIdRef.current;
    if (eid === undefined || eid === '' || API_BASE === '') return;

    const currentFetchId = ++fetchIdRef.current;

    const b = map.getBounds();
    const minLat = b.getSouth();
    const maxLat = b.getNorth();
    const minLng = b.getWest();
    const maxLng = b.getEast();

    try {
      const client = createResponseGridClient(API_BASE);
      const { data } = await client.GET(
        '/emergencies/{emergencyId}/public/resources/in-bounds',
        {
          params: {
            path: { emergencyId: eid },
            query: { minLat, minLng, maxLat, maxLng },
          },
        },
      );

      // Discard if a newer fetch has been issued.
      if (currentFetchId !== fetchIdRef.current) return;
      if (data == null) return;

      const resourcePoints: MapPoint[] = [];
      for (const r of data.items) {
        if (r.location.latitude === 0 && r.location.longitude === 0) continue;
        resourcePoints.push({
          id: r.id,
          lat: r.location.latitude,
          lng: r.location.longitude,
          label: r.name,
          kind: 'resource',
          status: r.publicStatus,
          resourceType: r.type,
          city: r.city ?? null,
          country: r.country ?? null,
          accepts: r.accepts,
        });
      }

      setAllMapPoints([...resourcePoints, ...needPointsRef.current]);
    } catch (err) {
      console.error('[EmergencyMapWrapper] in-bounds fetch error:', err);
    }
    // Stable: reads from refs (emergencyIdRef, fetchIdRef, needPointsRef) set in
    // layout effects and useEffect, so the function never captures stale values.
  }, []);

  // Called by EmergencyMap when the map instance is ready.
  // Registers moveend/zoomend listeners and returns a cleanup function.
  const handleMapReady = useCallback(
    (map: LeafletMap) => {
      // Initial load: fetch immediately (no debounce).
      void fetchForBounds(map);

      const debouncedFetch = createDebounced((m: LeafletMap) => void fetchForBounds(m));
      const handler = () => debouncedFetch(map);
      map.on('moveend', handler);
      map.on('zoomend', handler);

      // Return cleanup so MapReadyEmitter can unregister on unmount.
      return () => {
        debouncedFetch.cancel();
        map.off('moveend', handler);
        map.off('zoomend', handler);
      };
    },
    [fetchForBounds],
  );

  // When emergencyId is undefined (no server-side data), just render the map
  // with whatever SSR points were passed. If emergencyId is provided, the
  // onMapReady callback handles fetching.
  const effectivePoints =
    emergencyId === undefined || emergencyId === '' ? points : allMapPoints;

  return <EmergencyMap points={effectivePoints} onMapReady={handleMapReady} />;
}
