'use client';

/**
 * ResourceFilterBar — molecule for filtering the resource list.
 *
 * Provides:
 *  - Category <select> populated from facets.byCategory (with counts).
 *  - Country <select> populated from facets.byCountry (with counts).
 *  - Text search input (client-side, does not trigger re-fetch).
 *  - Active-filter chips with "×" dismiss buttons.
 *
 * Every control is a full-width field of identical height (Select / Input atoms
 * wrapped in FilterField) so the whole bar reads as one tidy form.
 *
 * Filter changes for category/country bubble up via callbacks so the parent
 * can reset the list and re-fetch page 1 with the new params.
 * Search text bubbles up via onSearchChange for client-side filtering.
 */

import type { Messages } from '@/i18n/messages/es';
import type { Locale } from '@/i18n';
import { categoryLabel } from '@/lib/categories';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';
import { FilterField } from '@/components/molecules/filter-field';

interface ResourceFilterBarProps {
  /** Facet counts keyed by category slug, e.g. { water: 5, food: 3 } */
  byCategory: Record<string, number>;
  /**
   * Facet counts keyed by the stored country string. The ingestion source
   * stores full Spanish country names (e.g. { Venezuela: 3, Colombia: 2 }),
   * which are shown verbatim in the country <select> and sent back as the
   * `country` filter value — so grouping must match those same strings.
   */
  byCountry: Record<string, number>;
  activeCategory: string;
  activeCountry: string;
  searchQuery: string;
  onCategoryChange: (category: string) => void;
  onCountryChange: (country: string) => void;
  onSearchChange: (query: string) => void;
  t: Messages['resource_filter'];
  locale: Locale;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ResourceFilterBar({
  byCategory,
  byCountry,
  activeCategory,
  activeCountry,
  searchQuery,
  onCategoryChange,
  onCountryChange,
  onSearchChange,
  t,
  locale,
}: ResourceFilterBarProps) {
  const categoryOptions = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  const countryOptions = Object.entries(byCountry).sort(([, a], [, b]) => b - a);

  const activeFilters: { key: 'category' | 'country'; label: string }[] = [];
  if (activeCategory !== '') {
    activeFilters.push({
      key: 'category',
      label: `${categoryLabel(activeCategory, locale)} (${byCategory[activeCategory] ?? 0})`,
    });
  }
  if (activeCountry !== '') {
    activeFilters.push({
      key: 'country',
      label: `${activeCountry} (${byCountry[activeCountry] ?? 0})`,
    });
  }

  function dismissFilter(key: 'category' | 'country') {
    if (key === 'category') onCategoryChange('');
    else onCountryChange('');
  }

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={t.aria_label}>
      <FilterField label={t.category_label}>
        <Select
          value={activeCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">{t.all_categories}</option>
          {categoryOptions.map(([slug, count]) => (
            <option key={slug} value={slug}>
              {categoryLabel(slug, locale)} ({count})
            </option>
          ))}
        </Select>
      </FilterField>

      {countryOptions.length > 0 && (
        <FilterField label={t.country_label}>
          <Select
            value={activeCountry}
            onChange={(e) => onCountryChange(e.target.value)}
          >
            <option value="">{t.all_countries}</option>
            {countryOptions.map(([country, count]) => (
              <option key={country} value={country}>
                {country} ({count})
              </option>
            ))}
          </Select>
        </FilterField>
      )}

      <FilterField label={t.search_label}>
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.search_placeholder}
          icon={<SearchIcon />}
        />
      </FilterField>

      {activeFilters.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          aria-label={t.active_filters_label}
          role="list"
        >
          {activeFilters.map((f) => (
            <span
              key={f.key}
              role="listitem"
              className="inline-flex items-center gap-1.5 rounded-full border border-navy bg-navy px-3 py-0.5 text-xs font-medium text-white"
            >
              {f.label}
              <button
                type="button"
                onClick={() => dismissFilter(f.key)}
                aria-label={t.remove_filter.replace('{label}', f.label)}
                className="ml-0.5 flex-shrink-0 rounded-full text-white hover:text-muted-soft focus:outline-none focus:ring-1 focus:ring-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
