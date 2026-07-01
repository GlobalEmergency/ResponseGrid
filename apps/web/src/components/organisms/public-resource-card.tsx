import type { components } from '@reliefhub/api-client';
import Link from 'next/link';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { StatusLight } from '@/components/atoms/status-light';
import { FreshnessIndicator } from '@/components/atoms/freshness-indicator';
import { Card } from '@/components/atoms/card';
import type { Messages } from '@/i18n/messages/es';
import type { Locale } from '@/i18n';
import { categoryLabel, categoryColor } from '@/lib/categories';
import {
  recipientTypeLabel,
  recipientTypeColor,
} from '@/lib/recipient-types';
import { RecipientTypeBadge } from '@/components/atoms/recipient-type-badge';
import { DisputedBadge } from '@/components/atoms/disputed-badge';

type ResourceViewDto = components['schemas']['ResourceViewDto'];

interface PublicResourceCardProps {
  resource: ResourceViewDto;
  t: Messages['resource_card'];
  tVerification: Messages['verification_badge'];
  tStatusLight: Messages['status_light'];
  locale?: Locale;
  /** When set, the card name links to the resource detail page (#59). */
  slug?: string;
  authed?: boolean;
}

export function PublicResourceCard({
  resource,
  t,
  tVerification,
  tStatusLight,
  locale = 'es',
  slug,
  authed = false,
}: PublicResourceCardProps) {
  const typeLabels: Record<ResourceViewDto['type'], string> = {
    collection_point: t.type_collection_point,
    delivery_point: t.type_delivery_point,
    collection_and_delivery: t.type_collection_and_delivery,
    warehouse: t.type_warehouse,
    transport: t.type_transport,
    supplier: t.type_supplier,
    venue: t.type_venue,
  };

  // Build the subtitle line: "tipo · ciudad, país" (omit nulls)
  const subtitleParts: string[] = [typeLabels[resource.type]];
  const locationParts: string[] = [];
  if (resource.city != null) locationParts.push(resource.city);
  if (resource.country != null) locationParts.push(resource.country);
  if (locationParts.length > 0) subtitleParts.push(locationParts.join(', '));
  const subtitle = subtitleParts.join(' · ');

  // Destinatario final (#60): show a type chip when the point is a recipient.
  const recipientTypeText =
    resource.recipientType != null
      ? recipientTypeLabel(resource.recipientType, locale)
      : null;

  return (
    <Card
      as="article"
      aria-label={t.aria_label.replace('{name}', resource.name)}
      className="flex flex-col gap-1.5 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge level={resource.verificationLevel} t={tVerification} />
        <StatusLight status={resource.publicStatus} t={tStatusLight} />
        {resource.disputed && <DisputedBadge label={t.disputed_label} />}
        {resource.isFinalRecipient && (
          <RecipientTypeBadge
            label={recipientTypeText ?? t.final_recipient_label}
            colorClass={
              resource.recipientType != null
                ? recipientTypeColor(resource.recipientType)
                : 'bg-navy text-white'
            }
            ariaLabel={
              recipientTypeText != null
                ? `${t.final_recipient_label}: ${recipientTypeText}`
                : t.final_recipient_label
            }
          />
        )}
      </div>

      <h3 className="text-[15px] font-bold leading-tight text-ink">
        {slug != null ? (
          <Link
            href={`/e/${slug}/recursos/${resource.id}`}
            className="hover:underline"
          >
            {resource.name}
          </Link>
        ) : (
          resource.name
        )}
      </h3>

      <p className="text-[12.5px] text-muted">{subtitle}</p>

      {(resource.accepts ?? []).length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-1" role="list" aria-label={t.accepts_label}>
          {(resource.accepts ?? []).map((slug) => (
            <span
              key={slug}
              role="listitem"
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor(slug)}`}
            >
              {categoryLabel(slug, locale)}
            </span>
          ))}
        </div>
      )}

      {/* sourceName is intentionally NOT rendered — ResponseGrid is the
          source of truth; external provenance is internal metadata only. */}
      {(resource.contact != null ||
        resource.schedule != null ||
        resource.manager != null) && (
        <dl className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
          {resource.contact != null && (
            <div className="flex items-center gap-1">
              <dt className="font-medium text-muted-soft">
                {resource.verificationLevel === 'official'
                  ? t.meta_contact_official
                  : t.meta_contact}
              </dt>
              <dd>
                {resource.verificationLevel === 'official' || authed ? (
                  resource.contact
                ) : (
                  <span className="italic text-muted-soft/80">
                    {t.contact_login_required}
                  </span>
                )}
              </dd>
            </div>
          )}
          {resource.schedule != null && (
            <div className="flex items-center gap-1">
              <dt className="font-medium text-muted-soft">{t.meta_schedule}</dt>
              <dd>{resource.schedule}</dd>
            </div>
          )}
          {resource.manager != null && (
            <div className="flex items-center gap-1">
              <dt className="font-medium text-muted-soft">{t.meta_manager}</dt>
              <dd>{resource.manager}</dd>
            </div>
          )}
        </dl>
      )}

      {resource.contact == null && (
        <p className="text-xs italic text-muted-soft">
          {t.no_official_contact}
        </p>
      )}

      {resource.externalUpdatedAt != null && (
        <FreshnessIndicator lastVerifiedAt={resource.externalUpdatedAt} />
      )}

      {/* The "report a problem" CTA (ficha 15) lives on the resource detail
          page, not on every list card — the card name links there. */}
    </Card>
  );
}
