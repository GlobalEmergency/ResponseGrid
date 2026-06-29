'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/atoms/input';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface SearchBoxProps {
  /** Search param to drive. Defaults to `q`. */
  paramKey?: string;
}

const SEARCH_ICON = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export function SearchBox({ paramKey = 'q' }: SearchBoxProps) {
  const tc = getMessages(useLocale()).coord;
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? '';

  const [value, setValue] = useState(current);
  // Track the last URL value we reconciled against so we can detect *external*
  // changes (back/forward, a Clear elsewhere) and reflect them into the input —
  // adjusting state during render, the React-recommended alternative to an
  // effect (https://react.dev/learn/you-might-not-need-an-effect).
  const [syncedValue, setSyncedValue] = useState(current);
  if (current !== syncedValue) {
    setSyncedValue(current);
    setValue(current);
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drop any pending debounce when unmounting.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function commit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === '') params.delete(paramKey);
    else params.set(paramKey, next);
    params.delete('page'); // a new query starts from the first page
    const qs = params.toString();
    router.replace(qs === '' ? '?' : `?${qs}`, { scroll: false });
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next.trim()), 300);
  }

  function clear() {
    setValue('');
    if (timer.current) clearTimeout(timer.current);
    commit('');
  }

  return (
    <div className="relative w-full">
      <Input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={tc.search_placeholder}
        aria-label={tc.search_aria}
        icon={SEARCH_ICON}
        className={value !== '' ? 'pr-10' : ''}
      />
      {value !== '' && (
        <button
          type="button"
          onClick={clear}
          aria-label={tc.search_clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-soft transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>
      )}
    </div>
  );
}
