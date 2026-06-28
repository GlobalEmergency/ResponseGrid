'use client';

/**
 * Clickable coordination queues. Each queue renders its items as compact
 * summary cards whose WHOLE surface is the tap target (≥44px, no hover-only
 * affordances). Tapping a card opens the mobile-first {@link DetailDrawer} with
 * that item's full detail + the relevant action(s). A successful action closes
 * the drawer and drops the item from the list immediately (the server action
 * has already revalidated the page, so the next load reflects it server-side).
 *
 * Visibility of each queue is decided by the page (permission-aware); these
 * components only receive the items they should show plus whether the principal
 * may act, which gates the drawer's action button(s).
 */
import { useState, useCallback } from 'react';
import type { components } from '@reliefhub/api-client';
import { Badge } from '@/components/atoms/badge';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { FreshnessIndicator } from '@/components/atoms/freshness-indicator';
import { EmptyState } from '@/components/molecules/empty-state';
import { NeedDetail } from '@/components/organisms/need-detail';
import { ResourceDetail } from '@/components/organisms/resource-detail';
import { OfferDetail } from '@/components/organisms/offer-detail';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { categoryLabel } from '@/lib/categories';

type NeedView = components['schemas']['NeedViewDto'];
type ResourceView = components['schemas']['ResourceViewDto'];
type OfferView = components['schemas']['OfferViewDto'];

const SUMMARY_CARD_CLASS =
  'flex w-full flex-col gap-2 rounded-lg border-2 border-navy bg-white p-5 text-left transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2';

const META_ROW_CLASS = 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted';

/** Tracks which ids the user has acted on so they vanish from the queue. */
function useActedSet() {
  const [acted, setActed] = useState<ReadonlySet<string>>(new Set());
  const markActed = useCallback((id: string) => {
    setActed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  return { acted, markActed };
}

const PRIORITY_BADGE: Record<
  NeedView['priority'],
  'priority-urgent' | 'priority-high' | 'priority-medium' | 'priority-low'
> = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

// ─────────────────────────────────────────────────────────────────────────────
// Needs queue
// ─────────────────────────────────────────────────────────────────────────────

interface NeedsQueueProps {
  needs: NeedView[];
  slug: string;
  canValidate: boolean;
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function NeedsQueue({
  needs,
  slug,
  canValidate,
  listLabel,
  emptyTitle,
  emptyDescription,
}: NeedsQueueProps) {
  const tc = getMessages(useLocale()).coord;
  const [openId, setOpenId] = useState<string | null>(null);
  const { acted, markActed } = useActedSet();

  const visible = needs.filter((n) => !acted.has(n.id));

  const PRIORITY_LABELS: Record<NeedView['priority'], string> = {
    low: tc.priority_low,
    medium: tc.priority_medium,
    high: tc.priority_high,
    urgent: tc.priority_urgent,
  };

  if (visible.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <ul className="flex flex-col gap-4" aria-label={listLabel}>
        {visible.map((need) => (
          <li key={need.id}>
            <button
              type="button"
              onClick={() => setOpenId(need.id)}
              className={SUMMARY_CARD_CLASS}
              aria-label={tc.drawer_open_need.replace('{title}', need.title)}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className="text-lg font-bold leading-tight text-ink break-words">
                  {need.title}
                </span>
                <Badge variant={PRIORITY_BADGE[need.priority]}>
                  {PRIORITY_LABELS[need.priority]}
                </Badge>
              </div>
              <FreshnessIndicator
                expiresAt={need.expiresAt}
                lastVerifiedAt={need.lastVerifiedAt}
              />
              <div className={META_ROW_CLASS}>
                {need.items[0] !== undefined && (
                  <span className="font-medium">
                    {need.items[0].name}
                    {need.items[0].unit != null && need.items[0].unit !== ''
                      ? ` · ${need.items[0].quantity} ${need.items[0].unit}`
                      : ` · ${need.items[0].quantity}`}
                  </span>
                )}
                <span aria-hidden="true" className="text-muted-soft">
                  →
                </span>
                <span className="font-semibold text-navy">
                  {tc.queue_view_detail}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {visible.map((need) =>
        openId === need.id ? (
          <NeedDetail
            key={`drawer-${need.id}`}
            need={need}
            slug={slug}
            canValidate={canValidate}
            open
            onClose={() => setOpenId(null)}
            onActionSuccess={() => {
              setOpenId(null);
              markActed(need.id);
            }}
          />
        ) : null,
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resources queue
// ─────────────────────────────────────────────────────────────────────────────

interface ResourcesQueueProps {
  resources: ResourceView[];
  slug: string;
  canVerify: boolean;
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function ResourcesQueue({
  resources,
  slug,
  canVerify,
  listLabel,
  emptyTitle,
  emptyDescription,
}: ResourcesQueueProps) {
  const tc = getMessages(useLocale()).coord;
  const [openId, setOpenId] = useState<string | null>(null);
  const { acted, markActed } = useActedSet();

  const visible = resources.filter((r) => !acted.has(r.id));

  const TYPE_LABELS: Record<ResourceView['type'], string> = {
    collection_point: tc.resource_type_collection_point,
    delivery_point: tc.resource_type_delivery_point,
    collection_and_delivery: tc.resource_type_collection_and_delivery,
    warehouse: tc.resource_type_warehouse,
    transport: tc.resource_type_transport,
    supplier: tc.resource_type_supplier,
    venue: tc.resource_type_venue,
  };

  if (visible.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <ul className="flex flex-col gap-4" aria-label={listLabel}>
        {visible.map((resource) => (
          <li key={resource.id}>
            <button
              type="button"
              onClick={() => setOpenId(resource.id)}
              className={SUMMARY_CARD_CLASS}
              aria-label={tc.drawer_open_resource.replace('{name}', resource.name)}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className="text-lg font-bold leading-tight text-ink break-words">
                  {resource.name}
                </span>
                <VerificationBadge level={resource.verificationLevel} />
              </div>
              <div className={META_ROW_CLASS}>
                <span className="font-medium">{TYPE_LABELS[resource.type]}</span>
                {resource.city != null && resource.city !== '' && (
                  <>
                    <span aria-hidden="true" className="text-muted-soft">
                      ·
                    </span>
                    <span>{resource.city}</span>
                  </>
                )}
                <span aria-hidden="true" className="text-muted-soft">
                  →
                </span>
                <span className="font-semibold text-navy">
                  {tc.queue_view_detail}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {visible.map((resource) =>
        openId === resource.id ? (
          <ResourceDetail
            key={`drawer-${resource.id}`}
            resource={resource}
            slug={slug}
            canVerify={canVerify}
            open
            onClose={() => setOpenId(null)}
            onActionSuccess={() => {
              setOpenId(null);
              markActed(resource.id);
            }}
          />
        ) : null,
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Offers queue
// ─────────────────────────────────────────────────────────────────────────────

const OFFER_STATUS_BADGE: Record<
  OfferView['status'],
  'offer-open' | 'offer-matched' | 'offer-fulfilled' | 'offer-cancelled'
> = {
  open: 'offer-open',
  matched: 'offer-matched',
  fulfilled: 'offer-fulfilled',
  cancelled: 'offer-cancelled',
};

interface OffersQueueProps {
  offers: OfferView[];
  validatedNeeds: NeedView[];
  slug: string;
  canMatch: boolean;
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function OffersQueue({
  offers,
  validatedNeeds,
  slug,
  canMatch,
  listLabel,
  emptyTitle,
  emptyDescription,
}: OffersQueueProps) {
  const locale = useLocale();
  const tc = getMessages(locale).coord;
  const [openId, setOpenId] = useState<string | null>(null);
  const { acted, markActed } = useActedSet();

  const visible = offers.filter((o) => !acted.has(o.id));

  const STATUS_LABELS: Record<OfferView['status'], string> = {
    open: tc.offer_status_open,
    matched: tc.offer_status_matched,
    fulfilled: tc.offer_status_fulfilled,
    cancelled: tc.offer_status_cancelled,
  };

  if (visible.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <ul className="flex flex-col gap-4" aria-label={listLabel}>
        {visible.map((offer) => {
          const unit =
            typeof offer.unit === 'string' && offer.unit !== ''
              ? offer.unit
              : null;
          return (
            <li key={offer.id}>
              <button
                type="button"
                onClick={() => setOpenId(offer.id)}
                className={SUMMARY_CARD_CLASS}
                aria-label={tc.drawer_open_offer.replace(
                  '{description}',
                  offer.description,
                )}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <span className="text-base font-bold leading-tight text-ink break-words">
                    {offer.description}
                  </span>
                  <Badge variant={OFFER_STATUS_BADGE[offer.status]}>
                    {STATUS_LABELS[offer.status]}
                  </Badge>
                </div>
                <div className={META_ROW_CLASS}>
                  <span className="font-medium">
                    {categoryLabel(offer.category, locale)}
                  </span>
                  <span aria-hidden="true" className="text-muted-soft">
                    ·
                  </span>
                  <span>
                    {offer.quantity}
                    {unit !== null ? ` ${unit}` : ''}
                  </span>
                  <span aria-hidden="true" className="text-muted-soft">
                    →
                  </span>
                  <span className="font-semibold text-navy">
                    {tc.queue_view_detail}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {visible.map((offer) =>
        openId === offer.id ? (
          <OfferDetail
            key={`drawer-${offer.id}`}
            offer={offer}
            validatedNeeds={validatedNeeds}
            slug={slug}
            canMatch={canMatch}
            open
            onClose={() => setOpenId(null)}
            onActionSuccess={() => {
              setOpenId(null);
              markActed(offer.id);
            }}
          />
        ) : null,
      )}
    </>
  );
}
