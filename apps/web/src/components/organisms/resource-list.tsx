'use client';

/**
 * ResourceList — paginated "load more" list of public resources.
 *
 * Starts with the `initialItems` fetched server-side (page 1).
 * Each "Cargar más" click fetches the next page from the client using the
 * typed API client and appends results (no full page reload).
 *
 * Supports:
 *  - Category + country filter props: re-fetches page 1 and resets
 *    accumulated items whenever they change.
 *  - Client-side text search over the already-loaded items.
 *  - Geographic grouping: Venezuela first, diaspora/others after.
 */

import { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { createResponseGridClient } from '@reliefhub/api-client';
import { groupByCountry, type ResourceViewDto } from '@/lib/group-by-country';
import { PublicResourceCard } from '@/components/organisms/public-resource-card';
import { ResourceFilterBar } from '@/components/molecules/resource-filter-bar';
import { EmptyState } from '@/components/molecules/empty-state';
import type { Messages } from '@/i18n/messages/es';
import type { Locale } from '@/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
if (!API_URL) {
  console.error(
    '[ResourceList] NEXT_PUBLIC_API_URL is not set — ' +
      '"Load more" will fail. Set this env var in your deployment.',
  );
}

const LIMIT = 50;

interface ResourceListProps {
  emergencyId: string;
  initialItems: ResourceViewDto[];
  total: number;
  /** Facet counts keyed by category slug */
  facetsByCategory: Record<string, number>;
  /** Facet counts keyed by the stored country string (full Spanish name, e.g. "Venezuela") */
  facetsByCountry: Record<string, number>;
  t: Messages['resource_card'];
  tVerification: Messages['verification_badge'];
  tStatusLight: Messages['status_light'];
  tList: Messages['resource_list'];
  tFilter: Messages['resource_filter'];
  tEmpty: { title: string; description?: string };
  locale: Locale;
}

export function ResourceList({
  emergencyId,
  initialItems,
  total: initialTotal,
  facetsByCategory,
  facetsByCountry,
  t,
  tVerification,
  tStatusLight,
  tList,
  tFilter,
  tEmpty,
  locale,
}: ResourceListProps) {
  // ── Filter state (category/country) → triggers re-fetch ──────────────────
  const [activeCategory, setActiveCategory] = useState('');
  const [activeCountry, setActiveCountry] = useState('');

  // ── Search state (client-side only, no re-fetch) ──────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ── Accumulated list state ────────────────────────────────────────────────
  const [items, setItems] = useState<ResourceViewDto[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [loadMoreError, setLoadMoreError] = useState(false);

  // ── Re-fetch page 1 whenever category or country changes ──────────────────
  const firstRun = useRef(true);

  useEffect(() => {
    // Skip only the very first mount (we already have initialItems from SSR)
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setLoadMoreError(false);
    startTransition(async () => {
      const client = createResponseGridClient(API_URL);
      const { data } = await client.GET(
        '/emergencies/{emergencyId}/public/resources',
        {
          params: {
            path: { emergencyId },
            query: {
              page: 1,
              limit: LIMIT,
              ...(activeCategory !== '' && { category: activeCategory }),
              ...(activeCountry !== '' && { country: activeCountry }),
            },
          },
        },
      );
      if (data != null) {
        setItems(data.items);
        setTotal(data.total);
        setPage(1);
      } else {
        setLoadMoreError(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeCountry]);

  function handleCategoryChange(category: string) {
    setActiveCategory(category);
    setSearchQuery('');
  }

  function handleCountryChange(country: string) {
    setActiveCountry(country);
    setSearchQuery('');
  }

  function handleLoadMore() {
    setLoadMoreError(false);
    startTransition(async () => {
      const nextPage = page + 1;
      const client = createResponseGridClient(API_URL);
      const { data } = await client.GET(
        '/emergencies/{emergencyId}/public/resources',
        {
          params: {
            path: { emergencyId },
            query: {
              page: nextPage,
              limit: LIMIT,
              ...(activeCategory !== '' && { category: activeCategory }),
              ...(activeCountry !== '' && { country: activeCountry }),
            },
          },
        },
      );
      if (data != null) {
        setItems((prev) => [...prev, ...data.items]);
        setPage(nextPage);
      } else {
        setLoadMoreError(true);
      }
    });
  }

  // ── Client-side search filter ─────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (searchQuery.trim() === '') return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.city != null && r.city.toLowerCase().includes(q)) ||
        (r.location.address?.toLowerCase().includes(q) ?? false),
    );
  }, [items, searchQuery]);

  // ── Geographic grouping ───────────────────────────────────────────────────
  const { venezuela, diaspora, other } = useMemo(
    () => groupByCountry(filteredItems),
    [filteredItems],
  );

  const isSearching = searchQuery.trim() !== '';
  const hasMore = !isSearching && items.length < total;

  if (items.length === 0 && !isPending) {
    return (
      <div className="flex flex-col gap-4">
        <ResourceFilterBar
          byCategory={facetsByCategory}
          byCountry={facetsByCountry}
          activeCategory={activeCategory}
          activeCountry={activeCountry}
          searchQuery={searchQuery}
          onCategoryChange={handleCategoryChange}
          onCountryChange={handleCountryChange}
          onSearchChange={setSearchQuery}
          t={tFilter}
          locale={locale}
        />
        <EmptyState title={tEmpty.title} description={tEmpty.description} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <ResourceFilterBar
        byCategory={facetsByCategory}
        byCountry={facetsByCountry}
        activeCategory={activeCategory}
        activeCountry={activeCountry}
        searchQuery={searchQuery}
        onCategoryChange={handleCategoryChange}
        onCountryChange={handleCountryChange}
        onSearchChange={setSearchQuery}
        t={tFilter}
        locale={locale}
      />

      {/* ── Summary line ────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-500">
        {isSearching
          ? tList.search_results.replace('{n}', String(filteredItems.length))
          : tList.showing
              .replace('{shown}', String(filteredItems.length))
              .replace('{total}', String(total))}
      </p>

      {filteredItems.length === 0 ? (
        <EmptyState title={tEmpty.title} description={tEmpty.description} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Venezuela group */}
          {venezuela.length > 0 && (
            <section aria-labelledby="group-ve-heading">
              <h3
                id="group-ve-heading"
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {tFilter.group_venezuela}
              </h3>
              <ul className="flex flex-col gap-3" role="list">
                {venezuela.map((resource) => (
                  <li key={resource.id}>
                    <PublicResourceCard
                      resource={resource}
                      t={t}
                      tVerification={tVerification}
                      tStatusLight={tStatusLight}
                      locale={locale}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Diaspora group */}
          {diaspora.length > 0 && (
            <section aria-labelledby="group-diaspora-heading">
              <h3
                id="group-diaspora-heading"
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {tFilter.group_diaspora}
              </h3>
              <ul className="flex flex-col gap-3" role="list">
                {diaspora.map((resource) => (
                  <li key={resource.id}>
                    <PublicResourceCard
                      resource={resource}
                      t={t}
                      tVerification={tVerification}
                      tStatusLight={tStatusLight}
                      locale={locale}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Other group (no country) */}
          {other.length > 0 && (
            <section aria-labelledby="group-other-heading">
              <h3
                id="group-other-heading"
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {tFilter.group_other}
              </h3>
              <ul className="flex flex-col gap-3" role="list">
                {other.map((resource) => (
                  <li key={resource.id}>
                    <PublicResourceCard
                      resource={resource}
                      t={t}
                      tVerification={tVerification}
                      tStatusLight={tStatusLight}
                      locale={locale}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ── Load more / errors ──────────────────────────────────────────── */}
      {loadMoreError && (
        <p role="alert" className="text-center text-sm text-red-600">
          <button
            type="button"
            onClick={handleLoadMore}
            className="underline hover:no-underline focus:outline-none"
          >
            {tList.load_more_error}
          </button>
        </p>
      )}

      {hasMore && !loadMoreError && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isPending}
          className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {isPending ? tList.loading : tList.load_more}
        </button>
      )}
    </div>
  );
}
