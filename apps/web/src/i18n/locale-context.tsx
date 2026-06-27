'use client';

/**
 * Client-side locale context — carries only the active locale string.
 *
 * `t` (the full message dictionary) is NOT passed through Context because
 * Server Component → Client Component serialisation cannot carry functions.
 * Instead, each Client Component receives `t` as a plain-object prop sliced
 * from the Server Component that renders it.
 *
 * Usage:
 *  1. Wrap with <LocaleProvider locale={locale}> in a Server Component.
 *  2. Call `useLocale()` to read the active locale in Client Components
 *     (e.g. LanguageSwitcher).
 */

import { createContext, useContext } from 'react';
import type { Locale } from './index';

const LocaleContext = createContext<Locale | null>(null);

interface LocaleProviderProps {
  locale: Locale;
  children: React.ReactNode;
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return (
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Returns the active locale. Must be inside <LocaleProvider>. */
export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  if (ctx === null) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}
