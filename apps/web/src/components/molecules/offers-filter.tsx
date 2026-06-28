'use client';

/**
 * Category + status filter for the coordination Offers queue. Drives the
 * `category` and `status` search params; the page applies them to the fetched
 * offers. Mirrors {@link NeedsFilter}'s URL-sync approach.
 */
import type { ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/atoms/select';
import { FilterField } from '@/components/molecules/filter-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { ALL_CATEGORIES, categoryLabel } from '@/lib/categories';

const STATUS_VALUES = ['open', 'matched', 'fulfilled', 'cancelled'] as const;

export function OffersFilter() {
  const locale = useLocale();
  const tc = getMessages(locale).coord;
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') ?? '';
  const currentStatus = searchParams.get('status') ?? '';

  const STATUS_LABELS: Record<(typeof STATUS_VALUES)[number], string> = {
    open: tc.offer_status_open,
    matched: tc.offer_status_matched,
    fulfilled: tc.offer_status_fulfilled,
    cancelled: tc.offer_status_cancelled,
  };

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs === '' ? '?' : `?${qs}`, { scroll: false });
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="group"
      aria-label={tc.offers_filter_group_label}
    >
      <FilterField label={tc.offers_filter_category_label}>
        <Select
          value={currentCategory}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            updateParam('category', e.target.value)
          }
          aria-label={tc.offers_filter_category_aria}
        >
          <option value="">{tc.offers_filter_category_all}</option>
          {ALL_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {categoryLabel(value, locale)}
            </option>
          ))}
        </Select>
      </FilterField>

      <FilterField label={tc.offers_filter_status_label}>
        <Select
          value={currentStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            updateParam('status', e.target.value)
          }
          aria-label={tc.offers_filter_status_aria}
        >
          <option value="">{tc.offers_filter_status_all}</option>
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </FilterField>
    </div>
  );
}
