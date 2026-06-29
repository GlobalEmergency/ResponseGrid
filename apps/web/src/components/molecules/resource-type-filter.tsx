'use client';

import type { ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/atoms/select';
import { FilterField } from '@/components/molecules/filter-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const TYPE_VALUES = [
  'collection_point',
  'delivery_point',
  'collection_and_delivery',
  'warehouse',
  'transport',
  'supplier',
  'venue',
] as const;

export function ResourceTypeFilter() {
  const tc = getMessages(useLocale()).coord;
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('type') ?? '';

  const TYPE_LABELS: Record<(typeof TYPE_VALUES)[number], string> = {
    collection_point: tc.resource_type_collection_point,
    delivery_point: tc.resource_type_delivery_point,
    collection_and_delivery: tc.resource_type_collection_and_delivery,
    warehouse: tc.resource_type_warehouse,
    transport: tc.resource_type_transport,
    supplier: tc.resource_type_supplier,
    venue: tc.resource_type_venue,
  };

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') params.delete('type');
    else params.set('type', value);
    params.delete('page');
    const qs = params.toString();
    router.replace(qs === '' ? '?' : `?${qs}`, { scroll: false });
  }

  return (
    <FilterField label={tc.resource_type_filter_label}>
      <Select
        value={current}
        onChange={onChange}
        aria-label={tc.resource_type_filter_aria}
      >
        <option value="">{tc.resource_type_filter_all}</option>
        {TYPE_VALUES.map((value) => (
          <option key={value} value={value}>
            {TYPE_LABELS[value]}
          </option>
        ))}
      </Select>
    </FilterField>
  );
}
