'use client';

/**
 * NearbyButton — triggers geolocation and fetches nearby resources.
 *
 * Privacy: coordinates are ephemeral — passed as query params to one API call
 * and never stored. They are obtained from navigator.geolocation.getCurrentPosition,
 * used immediately in the API call, and discarded once the call resolves.
 * Coordinates are NEVER written to localStorage, sessionStorage, cookies,
 * or any persistent React state.
 */

import { useState } from 'react';
import { createResponseGridClient } from '@reliefhub/api-client';
import type { components } from '@reliefhub/api-client';
import type { Messages } from '@/i18n/messages/es';

type NearbyResourceViewDto = components['schemas']['NearbyResourceViewDto'];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface NearbyButtonProps {
  emergencyId: string;
  tNearby: Messages['nearby_points'];
  onNearbyResults: (items: NearbyResourceViewDto[]) => void;
  onClear: () => void;
  onGeoError: () => void;
  active: boolean;
}

export function NearbyButton({
  emergencyId,
  tNearby,
  onNearbyResults,
  onClear,
  onGeoError,
  active,
}: NearbyButtonProps) {
  const [loading, setLoading] = useState(false);

  function handleFind() {
    if (!navigator.geolocation) {
      onGeoError();
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Coordinates are ephemeral — used only for this one API call.
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const client = createResponseGridClient(API_URL);
          const { data } = await client.GET(
            '/emergencies/{emergencyId}/public/resources/nearby',
            {
              params: {
                path: { emergencyId },
                query: { lat, lng, radius: 50000, limit: 50 },
              },
            },
          );

          if (data != null) {
            onNearbyResults(data.items);
          } else {
            onGeoError();
          }
        } catch {
          onGeoError();
        } finally {
          setLoading(false);
          // lat / lng go out of scope here — never persisted.
        }
      },
      () => {
        // Geolocation denied or unavailable
        setLoading(false);
        onGeoError();
      },
    );
  }

  if (active) {
    return (
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        {tNearby.button_clear}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFind}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4 flex-shrink-0"
      >
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
          fill="currentColor"
        />
      </svg>
      {loading ? tNearby.loading : tNearby.button_find}
    </button>
  );
}
