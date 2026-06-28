'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Messages } from '@/i18n/messages/es';
import { es } from '@/i18n/messages/es';
import { Select } from '@/components/atoms/select';
import { FilterField } from '@/components/molecules/filter-field';

interface NeedsFilterProps {
  t?: Messages['needs_filter'];
  te?: Messages['emergency'];
}

export function NeedsFilter({ t = es.needs_filter, te = es.emergency }: NeedsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') ?? '';
  const currentPriority = searchParams.get('priority') ?? '';

  const categoryOptions = [
    { value: '', label: t.all_categories },
    { value: 'food', label: te.category_food },
    { value: 'water', label: te.category_water },
    { value: 'hygiene', label: te.category_hygiene },
    { value: 'medical', label: te.category_medical },
    { value: 'shelter', label: te.category_shelter },
    { value: 'tools', label: te.category_tools },
    { value: 'other', label: te.category_other },
    { value: 'medicines', label: te.category_medicines },
    { value: 'medical_equipment', label: te.category_medical_equipment },
    { value: 'medical_supplies', label: te.category_medical_supplies },
    { value: 'medical_personnel', label: te.category_medical_personnel },
  ];

  const priorityOptions = [
    { value: '', label: t.all_priorities },
    { value: 'urgent', label: te.priority_urgent },
    { value: 'high', label: te.priority_high },
    { value: 'medium', label: te.priority_medium },
    { value: 'low', label: te.priority_low },
  ];

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={t.aria_label}>
      <FilterField label={t.category_label}>
        <Select
          value={currentCategory}
          onChange={(e) => updateParam('category', e.target.value)}
          aria-label={t.aria_filter_category}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FilterField>

      <FilterField label={t.priority_label}>
        <Select
          value={currentPriority}
          onChange={(e) => updateParam('priority', e.target.value)}
          aria-label={t.aria_filter_priority}
        >
          {priorityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FilterField>
    </div>
  );
}
