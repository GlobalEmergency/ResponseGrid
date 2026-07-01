'use client';

/**
 * Client-side categories context — carries the DB-sourced category taxonomy
 * (`Category[]`) fetched once in the root layout via `getCategoriesCached`.
 *
 * Mirrors `LocaleProvider` (`@/i18n/locale-context`): a Server Component
 * fetches the data and passes it down as a plain, serializable prop; Client
 * Components read it back out via the `useCategories`/`useCategoryLabel`
 * hooks instead of re-fetching or drilling props.
 *
 * Usage:
 *  1. Wrap with <CategoriesProvider categories={categories}> in a Server
 *     Component (e.g. the root layout), where `categories` comes from
 *     `getCategoriesCached(locale)`.
 *  2. Call `useCategories()` for the raw list, or `useCategoryLabel()` for a
 *     `(slug: string) => string` label resolver, in Client Components.
 */

import { createContext, useCallback, useContext } from 'react';
import { labelForCategory, type Category } from '@/domain/supplies/category';

const CategoriesContext = createContext<readonly Category[] | null>(null);

interface CategoriesProviderProps {
  categories: readonly Category[];
  children: React.ReactNode;
}

export function CategoriesProvider({ categories, children }: CategoriesProviderProps) {
  return (
    <CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider>
  );
}

/** Returns the active category catalogue. Must be inside <CategoriesProvider>. */
export function useCategories(): readonly Category[] {
  const ctx = useContext(CategoriesContext);
  if (ctx === null) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return ctx;
}

/**
 * Returns a `(slug: string) => string` resolver bound to the active category
 * catalogue. Falls back to the slug itself when not found (see
 * `labelForCategory`), so it is always safe to call.
 */
export function useCategoryLabel(): (slug: string) => string {
  const categories = useCategories();
  return useCallback((slug: string) => labelForCategory(slug, categories), [categories]);
}
