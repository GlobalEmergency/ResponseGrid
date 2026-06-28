import type { components } from '@reliefhub/api-client';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { StatusLight } from '@/components/atoms/status-light';
import { FreshnessIndicator } from '@/components/atoms/freshness-indicator';
import type { Messages } from '@/i18n/messages/es';
import type { Locale } from '@/i18n';
import { categoryLabel, categoryColor } from '@/lib/categories';

type ResourceViewDto = components['schemas']['ResourceViewDto'];

interface PublicResourceCardProps {
  resource: ResourceViewDto;
  t: Messages['resource_card'];
  tVerification: Messages['verification_badge'];
  tStatusLight: Messages['status_light'];
  locale?: Locale;
}

/**
 * PublicResourceCard — a verified logistics point (Banda oficial look):
 * trust + operational pills on top, name, then "type · stage · city, country".
 *
 * Carries the rich data layer: accepts chips (via `lib/categories`), a meta row
 * (contact / schedule / manager / source) and a freshness indicator. Every
 * extra field is null-guarded so the card degrades gracefully.
 */
export function PublicResourceCard({
  resource,
  t,
  tVerification,
  tStatusLight,
  locale = 'es',
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

  const stageLabels: Record<ResourceViewDto['stage'], string> = {
    origin: t.stage_origin,
    intermediate: t.stage_intermediate,
    destination: t.stage_destination,
  };

  // Build the subtitle line: "tipo · etapa · ciudad, país" (omit nulls)
  const subtitleParts: string[] = [typeLabels[resource.type], stageLabels[resource.stage]];
  const locationParts: string[] = [];
  if (resource.city != null) locationParts.push(resource.city);
  if (resource.country != null) locationParts.push(resource.country);
  if (locationParts.length > 0) subtitleParts.push(locationParts.join(', '));
  const subtitle = subtitleParts.join(' · ');

  return (
    <article
      aria-label={t.aria_label.replace('{name}', resource.name)}
      className="flex flex-col gap-1.5 rounded-card border border-line bg-white p-4"
    >
      {/* ── Trust + operational pills ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge level={resource.verificationLevel} t={tVerification} />
        <StatusLight status={resource.publicStatus} t={tStatusLight} />
      </div>

      {/* ── Name ────────────────────────────────────────────────────────── */}
      <h3 className="text-[15px] font-bold leading-tight text-ink">
        {resource.name}
      </h3>

      {/* ── Subtitle: type · stage · city, country ──────────────────────── */}
      <p className="text-[12.5px] text-muted">{subtitle}</p>

      {/* ── Accepts chips ───────────────────────────────────────────────── */}
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

      {/* ── Meta row: contact / schedule / manager ──────────────────────── */}
      {/* sourceName is intentionally NOT rendered — ResponseGrid is the
          source of truth; external provenance is internal metadata only. */}
      {(resource.contact != null ||
        resource.schedule != null ||
        resource.manager != null) && (
        <dl className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
          {resource.contact != null && (
            <div className="flex items-center gap-1">
              <dt className="font-medium text-muted-soft">{t.meta_contact}</dt>
              <dd>{resource.contact}</dd>
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

      {/* ── Freshness indicator ─────────────────────────────────────────── */}
      {resource.externalUpdatedAt != null && (
        <FreshnessIndicator lastVerifiedAt={resource.externalUpdatedAt} />
      )}
    </article>
  );
}
