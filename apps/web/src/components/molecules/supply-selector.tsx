'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/atoms/input';
import type { Locale } from '@/i18n';
import { searchSupplies } from '@/adapters/search-supplies';
import type { CatalogueSupply } from '@/domain/supplies/catalogue-supply';

interface SupplySelectorLabels {
  searching: string;
  noMatches: string;
  error: string;
  hint: string;
}

interface SupplySelectorProps {
  id: string;
  locale: Locale;
  placeholder: string;
  required?: boolean;
  name: string;
  supplyId: string | null;
  onTextChange: (name: string) => void;
  onSelect: (supply: CatalogueSupply) => void;
  onBlur: () => void;
  labels: SupplySelectorLabels;
}

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
  name,
  supplyId,
  onTextChange,
  onSelect,
  onBlur,
  labels,
}: SupplySelectorProps) {
  const [results, setResults] = useState<CatalogueSupply[]>([]);
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
        const data = await searchSupplies(trimmed, { locale, limit: 8 });
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

  const chooseSupply = useCallback(
    (supply: CatalogueSupply) => {
      onSelect(supply);
      setIsOpen(false);
      setResults([]);
      setFocusedIndex(-1);
    },
    [onSelect],
  );

  function handleInputChange(next: string) {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    setResults([]);
    setError(false);
    setLoading(false);
    setFocusedIndex(-1);
    onTextChange(next);
    setIsOpen(next.trim().length >= 2);
    debounceRef.current = setTimeout(() => {
      void fetchResults(next);
    }, DEBOUNCE_MS);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && name.trim().length >= 2) {
        setIsOpen(true);
        void fetchResults(name);
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
          value={name}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(name.trim().length >= 2)}
          onBlur={onBlur}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          icon={supplyId != null ? CheckIcon : SearchIcon}
          className={`flex-1 ${
            supplyId != null
              ? 'border-emerald-500 bg-emerald-50/10 focus:border-emerald-500 focus:ring-emerald-500/30'
              : ''
          }`}
        />
      </div>

      <p className="text-xs text-muted">{labels.hint}</p>

      {isOpen && name.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border-2 border-line bg-white shadow-lg max-h-80 overflow-auto">
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted">{labels.searching}</p>
          ) : error ? (
            <p className="px-4 py-3 text-sm text-danger">{labels.error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{labels.noMatches}</p>
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
                    <span className="text-xs text-muted">{supply.code}</span>
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
