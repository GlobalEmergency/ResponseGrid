import type { components } from '@reliefhub/api-client';

type CategoryDto = components['schemas']['CategoryDto'];

/**
 * Category — the frontend domain view of a taxonomy category, sourced from
 * `GET /categories` (single source of truth). `label` is already localized;
 * `kind` distinguishes aid material from personnel (PR 1). Colours are NOT here
 * — they are a presentation concern kept in `lib/categories`.
 */
export interface Category {
  slug: string;
  label: string;
  kind: 'material' | 'personnel';
  vertical: string;
  sort: number;
  parentSlug: string | null;
}

/** ACL: map the wire `CategoryDto` to the domain `Category`. */
export function fromCategoryDto(dto: CategoryDto): Category {
  return {
    slug: dto.slug,
    label: dto.label,
    kind: dto.kind,
    vertical: dto.vertical,
    sort: dto.sort,
    parentSlug: dto.parentSlug,
  };
}

/** True when the category holds aid material (excludes personnel). */
export function isMaterialCategory(c: Category): boolean {
  return c.kind === 'material';
}

/** Find a category by slug, or null when it is not in the list. */
export function resolveCategory(slug: string, all: readonly Category[]): Category | null {
  return all.find((c) => c.slug === slug) ?? null;
}

/** Categories ordered by display `sort`, then label. */
export function sortCategories(all: readonly Category[]): Category[] {
  return [...all].sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
}
