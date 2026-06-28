'use client';

/**
 * NearbyButton — triggers browser geolocation and hands the ephemeral
 * coordinates to the parent via `onLocate`. It is intentionally agnostic about
 * what is fetched (resources, needs, …); the parent decides.
 *
 * Privacy: coordinates are ephemeral — obtained from
 * navigator.geolocation.getCurrentPosition, passed once to `onLocate`, and then
 * discarded. They are NEVER written to localStorage, sessionStorage, cookies,
 * or any persistent React state.
 */

import { useState } from 'react';
import type { Messages } from '@/i18n/messages/es';

interface NearbyButtonProps {
  /**
   * Labels for the button. Structurally compatible with both `nearby_points`
   * and `nearby_needs` message blocks (only button_find / button_clear /
   * loading are read here).
   */
  tNearby: Messages['nearby_points'];
  /** Called with the ephemeral coordinates. May be async (the button stays in
   * its loading state until it settles). Throwing triggers onGeoError. */
  onLocate: (coords: { lat: number; lng: number }) => Promise<void> | void;
  onClear: () => void;
  onGeoError: () => void;
  active: boolean;
}

export function NearbyButton({
  tNearby,
  onLocate,
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
        // Coordinates are ephemeral — used only for this one call.
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          await onLocate({ lat, lng });
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-info-line bg-info-soft px-3 py-1.5 text-sm font-medium text-info hover:bg-info-soft focus:outline-none focus:ring-2 focus:ring-info-dot focus:ring-offset-2 transition-colors"
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-info-line bg-info-soft px-3 py-1.5 text-sm font-medium text-info hover:bg-info-soft focus:outline-none focus:ring-2 focus:ring-info-dot focus:ring-offset-2 disabled:opacity-50 transition-colors"
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
