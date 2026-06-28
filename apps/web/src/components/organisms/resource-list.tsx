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
 *  - Nearby mode: citizen geolocates and sees nearest points, ordered by
 *    distance. Filter bar, load-more and geographic grouping are hidden in
 *    this mode.
 */

import { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { createResponseGridClient } from '@reliefhub/api-client';
import type { components } from '@reliefhub/api-client';
import { groupByCountry, type ResourceViewDto } from '@/lib/group-by-country';
import { PublicResourceCard } from '@/components/organisms/public-resource-card';
import { ResourceFilterBar } from '@/components/molecules/resource-filter-bar';
import { EmptyState } from '@/components/molecules/empty-state';
import { NearbyButton } from '@/components/molecules/nearby-button';
import { DistanceBadge } from '@/components/atoms/distance-badge';
import { PrivacyLocationNotice } from '@/components/atoms/privacy-location-notice';
import type { Messages } from '@/i18n/messages/es';
import type { Locale } from '@/i18n';

type NearbyResourceViewDto = components['schemas']['NearbyResourceViewDto'];

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
  tNearby: Messages['nearby_points'];
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
  tNearby,
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

  // ── Nearby mode state ─────────────────────────────────────────────────────
  const [nearbyItems, setNearbyItems] = useState<NearbyResourceViewDto[] | null>(null);
  const [geoError, setGeoError] = useState(false);

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

  /**
   * Callback for NearbyButton: activates nearby mode with the API results.
   * An empty array means 0 results within range — still shows nearby mode.
   * Clearing nearby mode is handled by onClear → setNearbyItems(null).
   */
  function handleNearbyResults(nearbyResults: NearbyResourceViewDto[]) {
    setNearbyItems(nearbyResults);
    setGeoError(false);
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

  // ── Nearby mode rendering ─────────────────────────────────────────────────
  if (nearbyItems !== null) {
    return (
      <div className="flex flex-col gap-4">
        {/* NearbyButton in active state (shows "Volver a la lista") */}
        <NearbyButton
          emergencyId={emergencyId}
          tNearby={tNearby}
          onNearbyResults={handleNearbyResults}
          onClear={() => setNearbyItems(null)}
          onGeoError={() => setGeoError(true)}
          active
        />

        {/* Summary */}
        <p className="text-xs text-gray-500">
          {tNearby.showing_nearby.replace('{n}', String(nearbyItems.length))}
        </p>

        {/* Privacy notice */}
        <PrivacyLocationNotice text={tNearby.privacy_note} />

        {/* Nearby items list */}
        <ul className="flex flex-col gap-3" role="list">
          {nearbyItems.map((item) => (
            <li key={item.id}>
              <div className="relative">
                <PublicResourceCard
                  resource={item as unknown as ResourceViewDto}
                  t={t}
                  tVerification={tVerification}
                  tStatusLight={tStatusLight}
                  locale={locale}
                />
                <div className="mt-1 flex justify-end px-1">
                  <DistanceBadge distanceMeters={item.distanceMeters} locale={locale} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ── Normal mode rendering ─────────────────────────────────────────────────

  if (items.length === 0 && !isPending) {
    return (
      <div className="flex flex-col gap-4">
        {/* NearbyButton above filter bar */}
        <NearbyButton
          emergencyId={emergencyId}
          tNearby={tNearby}
          onNearbyResults={handleNearbyResults}
          onClear={() => setNearbyItems(null)}
          onGeoError={() => setGeoError(true)}
          active={nearbyItems !== null}
        />

        {/* Geo error alert */}
        {geoError && (
          <p role="alert" className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {tNearby.geo_error}
            {' '}
            <button
              type="button"
              onClick={() => setGeoError(false)}
              className="ml-1 underline hover:no-underline focus:outline-none"
              aria-label={tNearby.geo_error_dismiss}
            >
              ✕
            </button>
          </p>
        )}

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
      {/* ── NearbyButton above filter bar ───────────────────────────────── */}
      <NearbyButton
        emergencyId={emergencyId}
        tNearby={tNearby}
        onNearbyResults={handleNearbyResults}
        onClear={() => setNearbyItems(null)}
        onGeoError={() => setGeoError(true)}
        active={nearbyItems !== null}
      />

      {/* ── Geo error alert ──────────────────────────────────────────────── */}
      {geoError && nearbyItems === null && (
        <p role="alert" className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {tNearby.geo_error}
          {' '}
          <button
            type="button"
            onClick={() => setGeoError(false)}
            className="ml-1 underline hover:no-underline focus:outline-none"
            aria-label={tNearby.geo_error_dismiss}
          >
            ✕
          </button>
        </p>
      )}

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
