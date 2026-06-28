'use client';

/**
 * Status filter for the coordination Expediciones list. Drives the `status`
 * search param; the page passes it to the shipments endpoint. Mirrors
 * {@link OffersFilter}'s URL-sync approach.
 */
import type { ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/atoms/select';
import { FilterField } from '@/components/molecules/filter-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const STATUS_VALUES = [
  'planned',
  'assigned',
  'in_transit',
  'delivered',
  'failed',
  'cancelled',
] as const;

export function ShipmentsFilter() {
  const tc = getMessages(useLocale()).coord;
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') ?? '';

  const STATUS_LABELS: Record<(typeof STATUS_VALUES)[number], string> = {
    planned: tc.ship_status_planned,
    assigned: tc.ship_status_assigned,
    in_transit: tc.ship_status_in_transit,
    delivered: tc.ship_status_delivered,
    failed: tc.ship_status_failed,
    cancelled: tc.ship_status_cancelled,
  };

  function updateParam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') params.delete('status');
    else params.set('status', value);
    const qs = params.toString();
    router.replace(qs === '' ? '?' : `?${qs}`, { scroll: false });
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="group"
      aria-label={tc.shipments_filter_group_label}
    >
      <FilterField label={tc.shipments_filter_status_label}>
        <Select
          value={currentStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            updateParam(e.target.value)
          }
          aria-label={tc.shipments_filter_status_aria}
        >
          <option value="">{tc.shipments_filter_status_all}</option>
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
