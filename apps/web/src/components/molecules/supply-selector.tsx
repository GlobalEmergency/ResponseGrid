'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/atoms/input';
import type { Locale } from '@/i18n';

interface SupplyOption {
  id: string;
  code: string;
  name: string;
  categoryLabel: string;
}

export interface SupplySelectorValue {
  name: string;
  supplyId: string | null;
}

interface SupplySelectorProps {
  id: string;
  locale: Locale;
  placeholder: string;
  required?: boolean;
  value: SupplySelectorValue;
  onChange: (patch: Partial<SupplySelectorValue>) => void;
}

type Copy = {
  other: string;
  hint: string;
  loading: string;
  empty: string;
  error: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    other: 'Otro',
    hint: 'Busca por nombre, alias o código.',
    loading: 'Buscando insumos…',
    empty: 'No hay coincidencias. Usa “Otro” si no está en el catálogo.',
    error: 'No pudimos cargar sugerencias.',
  },
  en: {
    other: 'Other',
    hint: 'Search by name, alias, or code.',
    loading: 'Searching supplies…',
    empty: 'No matches. Use “Other” if it is not in the catalog.',
    error: 'We could not load suggestions.',
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const DEBOUNCE_MS = 220;

export function SupplySelector({
  id,
  locale,
  placeholder,
  required = false,
  value,
  onChange,
}: SupplySelectorProps) {
  const copy = COPY[locale];
  const [results, setResults] = useState<SupplyOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);

  const fetchResults = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setError(false);
        setLoading(false);
        setIsOpen(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const seq = ++requestSeq.current;
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          locale,
          limit: '8',
        });
        const response = await fetch(`${API_URL}/supplies?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('fetch failed');
        const data = (await response.json()) as SupplyOption[];
        if (seq !== requestSeq.current) return;
        setResults(data);
        setIsOpen(data.length > 0);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (seq !== requestSeq.current) return;
        setResults([]);
        setError(true);
        setIsOpen(true);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  function chooseSupply(supply: SupplyOption) {
    onChange({ name: supply.name, supplyId: supply.id });
    setIsOpen(false);
    setResults([]);
  }

  function handleInputChange(next: string) {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    setResults([]);
    setError(false);
    onChange({ name: next, supplyId: null });
    const hasEnough = next.trim().length >= 2;
    setLoading(hasEnough);
    setIsOpen(hasEnough);
    debounceRef.current = setTimeout(() => {
      void fetchResults(next);
    }, DEBOUNCE_MS);
  }

  function handleOther() {
    onChange({ supplyId: null });
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          required={required}
          autoComplete="off"
          value={value.name}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (value.name.trim().length >= 2) setIsOpen(true); }}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleOther}
          className="shrink-0 rounded-lg border-2 border-line bg-white px-3 py-3 text-sm font-semibold text-ink hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          {copy.other}
        </button>
      </div>

      <p className="text-xs text-muted">{copy.hint}</p>

      {isOpen && value.name.trim().length >= 2 && (
        <div className="rounded-lg border-2 border-line bg-white shadow-sm">
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted">{copy.loading}</p>
          ) : error ? (
            <p className="px-4 py-3 text-sm text-danger">{copy.error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{copy.empty}</p>
          ) : (
            <ul id={`${id}-listbox`} role="listbox" className="max-h-64 overflow-auto py-1">
              {results.map((supply) => (
                <li key={supply.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={supply.id === value.supplyId}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      chooseSupply(supply);
                    }}
                    className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-muted-soft focus:bg-muted-soft focus:outline-none"
                  >
                    <span className="text-sm font-semibold text-ink">{supply.name}</span>
                    <span className="text-xs text-muted">
                      {supply.code} · {supply.categoryLabel}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
