/**
 * Geographic grouping for the public resource list.
 *
 * `ResourceViewDto.country` is populated by the acopiove ingest mapper from the
 * source `pais` field, which holds a FULL SPANISH COUNTRY NAME (e.g.
 * "Venezuela", "España") — NOT an ISO 3166-1 alpha-2 code. The facet
 * `byCountry` keys and the country <select> in the filter bar therefore also
 * use those full names (the dropdown shows whatever string is stored). To stay
 * consistent with that stored value we match Venezuela case-insensitively on
 * the full name, and also accept the bare ISO code "VE" as a defensive fallback
 * for any record that happens to be stored that way.
 */

import type { components } from '@reliefhub/api-client';

export type ResourceViewDto = components['schemas']['ResourceViewDto'];

export interface GroupedResources {
  venezuela: ResourceViewDto[];
  diaspora: ResourceViewDto[];
  other: ResourceViewDto[];
}

/**
 * Returns true when a country value represents Venezuela.
 * Matches the full Spanish name "Venezuela" (case-insensitive, whitespace
 * trimmed) as stored by the ingestion source, plus the ISO 3166-1 alpha-2
 * fallback "VE".
 */
export function isVenezuela(country: string): boolean {
  const c = country.trim().toLowerCase();
  return c === 'venezuela' || c === 've';
}

/** Groups items into: Venezuela, Diaspora (non-Venezuela with country), Other (no country). */
export function groupByCountry(items: ResourceViewDto[]): GroupedResources {
  const venezuela: ResourceViewDto[] = [];
  const diaspora: ResourceViewDto[] = [];
  const other: ResourceViewDto[] = [];

  for (const item of items) {
    if (item.country != null && item.country !== '' && isVenezuela(item.country)) {
      venezuela.push(item);
    } else if (item.country != null && item.country !== '') {
      diaspora.push(item);
    } else {
      other.push(item);
    }
  }

  return { venezuela, diaspora, other };
}
