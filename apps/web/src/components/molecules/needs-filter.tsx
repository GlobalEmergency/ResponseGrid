'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Messages } from '@/i18n/messages/es';
import { es } from '@/i18n/messages/es';
import { Select } from '@/components/atoms/select';
import { FilterField } from '@/components/molecules/filter-field';
import { useLocale } from '@/i18n/locale-context';
import { ALL_CATEGORIES, categoryLabel } from '@/lib/categories';

interface NeedsFilterProps {
  t?: Messages['needs_filter'];
  te?: Messages['emergency'];
}

export function NeedsFilter({ t = es.needs_filter, te = es.emergency }: NeedsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const currentCategory = searchParams.get('category') ?? '';
  const currentPriority = searchParams.get('priority') ?? '';

  const categoryOptions = [
    { value: '', label: t.all_categories },
    ...ALL_CATEGORIES.map((slug) => ({
      value: slug,
      label: categoryLabel(slug, locale),
    })),
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
