/**
 * NeedCard — a validated need (Banda oficial look): priority pill + freshness on
 * top, title, the headline item, optional privacy notice and an offer CTA.
 */
import Link from 'next/link';
import type { components } from '@reliefhub/api-client';
import { Card } from '@/components/atoms/card';
import { PriorityBadge, type Priority } from '@/components/atoms/priority-badge';
import { FreshnessIndicator } from '@/components/atoms/freshness-indicator';
import { PrivacyLocationNotice } from '@/components/atoms/privacy-location-notice';
import { categoryLabel } from '@/lib/categories';
import type { Messages } from '@/i18n/messages/es';

type NeedViewDto = components['schemas']['NeedViewDto'];

interface NeedCardProps {
  need: NeedViewDto;
  te: Messages['emergency'];
  slug: string;
  active: boolean;
  locale: 'es' | 'en';
}

export function NeedCard({ need, te, slug, active, locale }: NeedCardProps) {
  const priority = need.priority as Priority;
  const item = need.items[0];
  const categoryText =
    item !== undefined ? categoryLabel(item.category, locale) : undefined;
  const quantity =
    item !== undefined
      ? `${String(item.quantity)}${item.unit != null ? ` ${String(item.unit)}` : ''}`
      : undefined;
  const detail = [quantity, categoryText].filter(Boolean).join(' · ');
  const approximate = need.locationSensitivity === 'approximate';

  return (
    <Card as="article" className="flex flex-col gap-2.5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge
          priority={priority}
          label={te[`priority_${priority}` as keyof typeof te] as string}
          ariaPrefix={te.needs_priority_label}
        />
        <FreshnessIndicator expiresAt={need.expiresAt} lastVerifiedAt={need.lastVerifiedAt} />
      </div>
      <h3 className="text-[15px] font-bold leading-tight text-ink">{need.title}</h3>
      {detail !== '' && <p className="text-[12.5px] text-muted">{detail}</p>}
      {item?.presentation != null && (
        <p className="text-[12.5px] font-semibold text-ink">
          {item.presentation}
        </p>
      )}
      {approximate && <PrivacyLocationNotice text={te.privacy_approximate_location} />}
      {active && (
        <Link
          href={`/e/${slug}/donar/ofrecer?needId=${need.id}`}
          className="inline-flex w-fit items-center justify-center rounded-lg border border-navy bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          {te.needs_offer_button}
        </Link>
      )}
    </Card>
  );
}
