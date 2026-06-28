'use client';

/**
 * Lean mode + status filter for the read-only "Capacidades disponibles" panel.
 * Drives the `capMode` and `capStatus` search params; the expediciones page
 * applies them to the fetched capacities. Mirrors {@link OffersFilter}.
 */
import type { ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/atoms/select';
import { FilterField } from '@/components/molecules/filter-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const MODE_VALUES = ['road', 'sea', 'air'] as const;
const STATUS_VALUES = ['available', 'reserved', 'withdrawn'] as const;

export function CapacitiesFilter() {
  const tc = getMessages(useLocale()).coord;
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMode = searchParams.get('capMode') ?? '';
  const currentStatus = searchParams.get('capStatus') ?? '';

  const MODE_LABELS: Record<(typeof MODE_VALUES)[number], string> = {
    road: tc.ship_mode_road,
    sea: tc.ship_mode_sea,
    air: tc.ship_mode_air,
  };
  const STATUS_LABELS: Record<(typeof STATUS_VALUES)[number], string> = {
    available: tc.cap_status_available,
    reserved: tc.cap_status_reserved,
    withdrawn: tc.cap_status_withdrawn,
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
      aria-label={tc.cap_filter_group_label}
    >
      <FilterField label={tc.cap_filter_mode_label}>
        <Select
          value={currentMode}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            updateParam('capMode', e.target.value)
          }
          aria-label={tc.cap_filter_mode_aria}
        >
          <option value="">{tc.cap_filter_mode_all}</option>
          {MODE_VALUES.map((value) => (
            <option key={value} value={value}>
              {MODE_LABELS[value]}
            </option>
          ))}
        </Select>
      </FilterField>

      <FilterField label={tc.cap_filter_status_label}>
        <Select
          value={currentStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            updateParam('capStatus', e.target.value)
          }
          aria-label={tc.cap_filter_status_aria}
        >
          <option value="">{tc.cap_filter_status_all}</option>
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
