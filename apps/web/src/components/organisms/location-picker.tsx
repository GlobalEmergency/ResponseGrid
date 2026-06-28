'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

// Load the map only on the client — Leaflet uses `window` and cannot run on the server.
const LeafletMap = dynamic(() => import('./leaflet-map'), { ssr: false });

const DEBOUNCE_MS = 400;

interface LocationPickerProps {
  /** Optional pre-selected location (e.g. when editing an existing record). */
  defaultValue?: SelectedLocation;
}

export function LocationPicker({ defaultValue }: LocationPickerProps) {
  const [query, setQuery] = useState(defaultValue?.address ?? '');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<SelectedLocation | null>(
    defaultValue ?? null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced geocode fetch
  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(q)}`,
      );
      const data: GeocodeResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    // Clear previous selection when typing
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchResults(value);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (result: GeocodeResult) => {
    setSelected(result);
    setQuery(result.address);
    setIsOpen(false);
    setResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3" ref={containerRef}>
      {/* Search input */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="location-search"
          className="text-sm font-semibold text-ink"
        >
          Buscar dirección
        </label>
        <div className="relative">
          <input
            id="location-search"
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="location-results"
            aria-label="Buscar dirección"
            autoComplete="off"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Calle Mayor 1, Madrid…"
            className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          />
          {loading && (
            <span
              aria-live="polite"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-soft"
            >
              Buscando…
            </span>
          )}
        </div>

        {/* Dropdown results */}
        {isOpen && results.length > 0 && (
          <ul
            id="location-results"
            role="listbox"
            aria-label="Resultados de geocodificación"
            className="mt-1 max-h-52 overflow-auto rounded-lg border-2 border-line bg-white shadow-lg"
          >
            {results.map((result) => (
              <li key={`${result.latitude},${result.longitude}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent blur before click fires
                    e.preventDefault();
                    handleSelect(result);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-ink hover:bg-surface focus:bg-surface focus:outline-none"
                >
                  {result.address}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hidden inputs — carry values in the parent form submission */}
      <input type="hidden" name="address" value={selected?.address ?? ''} />
      <input
        type="hidden"
        name="latitude"
        value={selected?.latitude ?? ''}
      />
      <input
        type="hidden"
        name="longitude"
        value={selected?.longitude ?? ''}
      />

      {/* Mini map — rendered only when a location is selected */}
      {selected !== null && (
        <div aria-label={`Mapa mostrando: ${selected.address}`}>
          <LeafletMap
            latitude={selected.latitude}
            longitude={selected.longitude}
            address={selected.address}
          />
          <p className="mt-1 text-xs text-muted">{selected.address}</p>
        </div>
      )}
    </div>
  );
}
