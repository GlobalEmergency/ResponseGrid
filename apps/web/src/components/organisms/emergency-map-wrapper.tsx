'use client';

import dynamic from 'next/dynamic';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { MapPoint } from './emergency-map';
import { createResponseGridClient } from '@responsegrid/api-client';
import type { Map as LeafletMap, LatLngBounds } from 'leaflet';

// Leaflet must only run in the browser — dynamic with ssr:false is only
// valid inside a Client Component (Server Components forbid it in Next 16).
const EmergencyMap = dynamic(() => import('./emergency-map'), { ssr: false });

interface EmergencyMapWrapperProps {
  points: MapPoint[];
  /** If provided, fetch resource points client-side for this emergency using bounding-box queries */
  emergencyId?: string;
  /** Tailwind classes for the map container (forwarded to EmergencyMap). */
  containerClassName?: string;
  /** Emergency slug — forwarded to the map so resource popups can link to the
   * detail page and the "report a problem" flow (ficha 15, #155). */
  slug?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const DEBOUNCE_MS = 400;

/**
 * How much to grow the requested bounding box beyond the visible viewport
 * (0.35 = +35% on every side). Fetching a margin means small pans stay inside
 * already-loaded data, so no new request is fired.
 */
const BOUNDS_PADDING = 0.35;

/**
 * Server-side cap for a single in-bounds request. When a response returns
 * FEWER than this, we know we have every point in that box and can safely skip
 * refetching while the viewport stays inside it (e.g. when zooming in).
 */
const IN_BOUNDS_LIMIT = 500;

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

export function EmergencyMapWrapper({ points, emergencyId, containerClassName, slug }: EmergencyMapWrapperProps) {
  // allMapPoints drives what the map renders. Initially = SSR prop (resources +
  // needs, page 1); once the map is ready it is replaced by viewport queries.
  const [allMapPoints, setAllMapPoints] = useState<MapPoint[]>(points);

  // Guard against stale in-flight requests: only the latest fetch wins.
  const fetchIdRef = useRef(0);

  // Coverage of the most recent successful fetch: the (padded) bounds we loaded
  // and whether that load was complete (returned < IN_BOUNDS_LIMIT). While the
  // viewport stays inside a complete coverage we skip the network entirely.
  const coverageRef = useRef<{ bounds: LatLngBounds | null; complete: boolean }>({
    bounds: null,
    complete: false,
  });

  const emergencyIdRef = useRef(emergencyId);
  useEffect(() => {
    emergencyIdRef.current = emergencyId;
  }, [emergencyId]);

  // fetchForBounds is defined as a stable useCallback so it can be listed as
  // a dep in handleMapReady. The actual work reads from refs (emergencyIdRef,
  // fetchIdRef, coverageRef) so it never goes stale between renders.
  const fetchForBounds = useCallback(async (map: LeafletMap) => {
    const eid = emergencyIdRef.current;
    if (eid === undefined || eid === '' || API_BASE === '') return;

    const viewport = map.getBounds();

    // Skip the request when the visible area is already fully inside a complete
    // coverage — e.g. the citizen zoomed in or nudged the map a little. The
    // markers are already loaded, so clustering just re-renders from memory.
    const coverage = coverageRef.current;
    if (
      coverage.complete &&
      coverage.bounds !== null &&
      coverage.bounds.contains(viewport)
    ) {
      return;
    }

    const currentFetchId = ++fetchIdRef.current;

    // Request a padded box (not just the exact viewport) so subsequent small
    // pans/zooms reuse the same data instead of hitting the network again.
    const padded = viewport.pad(BOUNDS_PADDING);
    const query = {
      minLat: padded.getSouth(),
      minLng: padded.getWest(),
      maxLat: padded.getNorth(),
      maxLng: padded.getEast(),
      limit: IN_BOUNDS_LIMIT,
    };

    try {
      const client = createResponseGridClient(API_BASE);
      // Resources and needs are both scoped to the viewport so the map stays
      // fast even with hundreds of each.
      const [resourcesRes, needsRes] = await Promise.all([
        client.GET('/emergencies/{emergencyId}/public/resources/in-bounds', {
          params: { path: { emergencyId: eid }, query },
        }),
        client.GET('/emergencies/{emergencyId}/public/needs/in-bounds', {
          params: { path: { emergencyId: eid }, query },
        }),
      ]);

      // Discard if a newer fetch has been issued.
      if (currentFetchId !== fetchIdRef.current) return;

      const resourceItems = resourcesRes.data?.items ?? null;
      const needItems = needsRes.data?.items ?? null;
      if (resourceItems === null && needItems === null) return;

      const nextPoints: MapPoint[] = [];
      for (const r of resourceItems ?? []) {
        if (r.location.latitude === 0 && r.location.longitude === 0) continue;
        nextPoints.push({
          id: r.id,
          lat: r.location.latitude,
          lng: r.location.longitude,
          label: r.name,
          kind: 'resource',
          status: r.publicStatus,
          disputed: r.disputed,
          resourceType: r.type,
          city: r.city ?? null,
          country: r.country ?? null,
          accepts: r.accepts,
        });
      }
      for (const n of needItems ?? []) {
        if (n.location.latitude === 0 && n.location.longitude === 0) continue;
        nextPoints.push({
          id: n.id,
          lat: n.location.latitude,
          lng: n.location.longitude,
          label: n.title,
          kind: 'need',
          approximate: n.locationSensitivity === 'approximate',
        });
      }
      setAllMapPoints(nextPoints);

      // "complete" means neither list was truncated by the limit, so every
      // point in the box is loaded and we can skip refetching inside it.
      coverageRef.current = {
        bounds: padded,
        complete:
          (resourceItems?.length ?? 0) < IN_BOUNDS_LIMIT &&
          (needItems?.length ?? 0) < IN_BOUNDS_LIMIT,
      };
    } catch (err) {
      console.error('[EmergencyMapWrapper] in-bounds fetch error:', err);
    }
    // Stable: reads from refs (emergencyIdRef, fetchIdRef, coverageRef), so the
    // function never captures stale values between renders.
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

  return (
    <EmergencyMap
      points={effectivePoints}
      onMapReady={handleMapReady}
      {...(containerClassName !== undefined && { containerClassName })}
      {...(slug !== undefined && { slug })}
    />
  );
}
