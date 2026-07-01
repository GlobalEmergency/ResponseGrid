import { cache } from 'react';
import { api } from '@/lib/api';
import { fromCategoryDto, sortCategories, type Category } from '@/domain/supplies/category';

/** Categories change rarely — revalidate the Next data cache hourly. */
const CATEGORIES_REVALIDATE_SECONDS = 60 * 60;

/**
 * Fetch the shared category taxonomy (`GET /categories`) and map it to the
 * domain `Category[]`, sorted. SERVER-ONLY: uses the server API client
 * (`lib/api`). Server pages fetch this and pass it down to client form
 * components, so categories come from the DB (single source of truth), not a
 * hardcoded frontend mirror.
 *
 * Throws on failure — existing callers (server actions, pages) rely on this
 * to surface API errors. For call sites that must never crash (e.g. the root
 * layout), use `getCategoriesCached` instead.
 */
export async function getCategories(locale: string): Promise<Category[]> {
  const { data, error } = await api.GET('/categories', {
    params: { query: { locale } },
    // `next` is Next.js's fetch extension, forwarded by openapi-fetch's
    // RequestInit passthrough (not part of the OpenAPI schema types).
    next: { revalidate: CATEGORIES_REVALIDATE_SECONDS },
  });
  if (error || !data) {
    throw new Error('getCategories failed');
  }
  return sortCategories(data.map(fromCategoryDto));
}

/**
 * Cached, resilient variant of `getCategories` for app-wide consumers (e.g.
 * the root layout) that must not crash when the API is unreachable.
 *
 * Caching strategy:
 *  - `React.cache` dedupes repeated calls within the same render/request pass
 *    (e.g. layout + multiple pages all asking for the same locale).
 *  - The underlying fetch also sets `next.revalidate`, so Next's data cache
 *    reuses the response across requests for up to an hour — the taxonomy is
 *    near-static, so this avoids hitting the API on every request.
 *  - On failure (API down, network error, etc.) this returns `[]` instead of
 *    throwing, so a categories outage never takes down the whole app.
 */
export const getCategoriesCached = cache(async (locale: string): Promise<Category[]> => {
  try {
    return await getCategories(locale);
  } catch {
    return [];
  }
});
