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

const CheckIcon = (
  <svg
    className="h-5 w-5 text-emerald-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SearchIcon = (
  <svg
    className="h-5 w-5 text-muted-soft"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        setFocusedIndex(-1);
        return;
      }

      const seq = ++requestSeq.current;
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          locale,
          limit: '8',
        });
        const response = await fetch(`${API_URL}/supplies?${params.toString()}`);
        if (!response.ok) throw new Error('fetch failed');
        const data = (await response.json()) as SupplyOption[];
        if (seq !== requestSeq.current) return;
        setResults(data);
        setIsOpen(data.length > 0);
        setFocusedIndex(-1);
      } catch {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setError(true);
        setIsOpen(true);
        setFocusedIndex(-1);
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

  const chooseSupply = useCallback((supply: SupplyOption) => {
    onChange({ name: supply.name, supplyId: supply.id });
    setIsOpen(false);
    setResults([]);
    setFocusedIndex(-1);
  }, [onChange]);

  function handleInputChange(next: string) {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    setResults([]);
    setError(false);
    setLoading(false);
    setFocusedIndex(-1);
    onChange({ name: next, supplyId: null });
    setIsOpen(next.trim().length >= 2);
    debounceRef.current = setTimeout(() => {
      void fetchResults(next);
    }, DEBOUNCE_MS);
  }

  function handleOther() {
    onChange({ supplyId: null });
    setIsOpen(false);
    setFocusedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && value.name.trim().length >= 2) {
        setIsOpen(true);
        void fetchResults(value.name);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1 < results.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < results.length) {
        e.preventDefault();
        chooseSupply(results[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          required={required}
          autoComplete="off"
          value={value.name}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(value.name.trim().length >= 2)}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          icon={value.supplyId ? CheckIcon : SearchIcon}
          className={`flex-1 ${
            value.supplyId
              ? 'border-emerald-500 bg-emerald-50/10 focus:border-emerald-500 focus:ring-emerald-500/30'
              : ''
          }`}
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
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border-2 border-line bg-white shadow-lg max-h-80 overflow-auto">
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted">{copy.loading}</p>
          ) : error ? (
            <p className="px-4 py-3 text-sm text-danger">{copy.error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{copy.empty}</p>
          ) : (
            <ul id={`${id}-listbox`} role="listbox" className="py-1">
              {results.map((supply, idx) => (
                <li key={supply.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === focusedIndex}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      chooseSupply(supply);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left focus:outline-none ${
                      idx === focusedIndex ? 'bg-muted-soft' : 'hover:bg-muted-soft'
                    }`}
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
