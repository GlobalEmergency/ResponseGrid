'use client';

/**
 * NeedsList — public list of validated needs with an optional "near me" mode.
 *
 * By default it renders the `initialItems` fetched server-side (already
 * filtered by category/priority via the URL). When the citizen activates the
 * NearbyButton, their ephemeral location is sent to the needs/nearby endpoint
 * and the list is replaced by the nearest validated needs, each annotated with
 * a DistanceBadge. Clearing returns to the default (filtered) list.
 *
 * Location privacy: the coordinates never leave the browser except as the
 * query of a single API call, and the distances shown for needs flagged as
 * "approximate" are derived server-side from the jittered point (see
 * GetNearbyNeeds), so an exact position is never exposed.
 */

import { useState, useTransition, type ReactNode } from 'react';
import { createResponseGridClient } from '@reliefhub/api-client';
import type { components } from '@reliefhub/api-client';
import { NeedCard } from '@/components/molecules/need-card';
import { NearbyButton } from '@/components/molecules/nearby-button';
import { DistanceBadge } from '@/components/atoms/distance-badge';
import { PrivacyLocationNotice } from '@/components/atoms/privacy-location-notice';
import { EmptyState } from '@/components/molecules/empty-state';
import type { Messages } from '@/i18n/messages/es';
import type { Locale } from '@/i18n';

type NeedViewDto = components['schemas']['NeedViewDto'];
type NearbyNeedViewDto = components['schemas']['NearbyNeedViewDto'];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
if (!API_URL) {
  console.error(
    '[NeedsList] NEXT_PUBLIC_API_URL is not set — ' +
      '"nearby needs" will fail. Set this env var in your deployment.',
  );
}

const RADIUS_METERS = 50000;
const NEEDS_PAGE_SIZE = 50;

interface NeedsListProps {
  emergencyId: string;
  slug: string;
  initialItems: NeedViewDto[];
  te: Messages['emergency'];
  tNearby: Messages['nearby_needs'];
  tList: Messages['resource_list'];
  emptyTitle: string;
  active: boolean;
  locale: Locale;
  /** Active category/priority filters (so "load more" keeps the same filter). */
  category?: string;
  priority?: string;
  /** Filter controls rendered between the "near me" button and the list. */
  filterSlot?: ReactNode;
}

export function NeedsList({
  emergencyId,
  slug,
  initialItems,
  te,
  tNearby,
  tList,
  emptyTitle,
  active,
  locale,
  category,
  priority,
  filterSlot,
}: NeedsListProps) {
  const [nearby, setNearby] = useState<NearbyNeedViewDto[] | null>(null);
  const [geoError, setGeoError] = useState(false);

  // Accumulated list ("load more"), seeded with the SSR page 1.
  const [items, setItems] = useState<NeedViewDto[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length === NEEDS_PAGE_SIZE);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [seededFrom, setSeededFrom] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  // Reset when the server provides a fresh page 1 (e.g. after a category/
  // priority filter change navigates the page). Adjusting state during render
  // — not in an effect — is React's recommended "derive from props" pattern.
  if (initialItems !== seededFrom) {
    setSeededFrom(initialItems);
    setItems(initialItems);
    setHasMore(initialItems.length === NEEDS_PAGE_SIZE);
    setLoadMoreError(false);
  }

  function handleLoadMore() {
    setLoadMoreError(false);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          limit: String(NEEDS_PAGE_SIZE),
          offset: String(items.length),
        });
        if (category !== undefined && category !== '') params.set('category', category);
        if (priority !== undefined && priority !== '') params.set('priority', priority);
        const res = await fetch(
          `${API_URL}/emergencies/${emergencyId}/public/needs?${params.toString()}`,
        );
        if (!res.ok) throw new Error('load more failed');
        const data = (await res.json()) as NeedViewDto[];
        setItems((prev) => [...prev, ...data]);
        setHasMore(data.length === NEEDS_PAGE_SIZE);
      } catch {
        setLoadMoreError(true);
      }
    });
  }

  async function handleLocate({ lat, lng }: { lat: number; lng: number }) {
    const client = createResponseGridClient(API_URL);
    const { data } = await client.GET(
      '/emergencies/{emergencyId}/public/needs/nearby',
      {
        params: {
          path: { emergencyId },
          query: { lat, lng, radius: RADIUS_METERS, limit: 50 },
        },
      },
    );
    if (data == null) throw new Error('nearby needs request failed');
    setNearby(data.items);
    setGeoError(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* "Cerca de mí" is always the first option, above the filters. */}
      <NearbyButton
        tNearby={tNearby}
        onLocate={handleLocate}
        onClear={() => setNearby(null)}
        onGeoError={() => setGeoError(true)}
        active={nearby !== null}
      />

      {/* Filters apply to the default list only — hidden while in nearby mode. */}
      {nearby === null && filterSlot}

      {geoError && nearby === null && (
        <p
          role="alert"
          className="rounded-card border border-warning bg-warning-soft px-3 py-2 text-xs text-warning"
        >
          {tNearby.geo_error}{' '}
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

      {nearby !== null ? (
        <>
          <p className="text-xs text-muted">
            {tNearby.showing_nearby.replace('{n}', String(nearby.length))}
          </p>
          <PrivacyLocationNotice text={tNearby.privacy_note} />
          {nearby.length === 0 ? (
            <EmptyState title={emptyTitle} />
          ) : (
            <ul
              className="flex flex-col gap-2.5"
              role="list"
              aria-label={te.needs_aria_label}
            >
              {nearby.map((need) => (
                <li key={need.id}>
                  <div className="relative">
                    <NeedCard
                      need={need}
                      te={te}
                      slug={slug}
                      active={active}
                      locale={locale}
                    />
                    <div className="mt-1 flex justify-end px-1">
                      <DistanceBadge
                        distanceMeters={need.distanceMeters}
                        locale={locale}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <>
          <ul
            className="flex flex-col gap-2.5"
            role="list"
            aria-label={te.needs_aria_label}
          >
            {items.map((need) => (
              <li key={need.id}>
                <NeedCard
                  need={need}
                  te={te}
                  slug={slug}
                  active={active}
                  locale={locale}
                />
              </li>
            ))}
          </ul>

          {loadMoreError && (
            <p role="alert" className="text-center text-sm text-danger">
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
              className="w-full rounded-lg border-2 border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isPending ? tList.loading : tList.load_more}
            </button>
          )}
        </>
      )}
    </div>
  );
}
