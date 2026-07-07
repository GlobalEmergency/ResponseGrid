import { CategoryValidationError } from './category-errors.js';

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
const MAX_LENGTH = 64;

/**
 * The identity of an aid-material category as a **data-driven slug** — the open
 * counterpart of the closed {@link Category} enum. A `CategorySlug` is any
 * validated `snake_case` token (`food`, `medical_equipment`, `hygiene_infantile`,
 * or a tenant-defined subcategory), so the taxonomy can grow through data
 * (the `categories` table / {@link CategoryRegistry}) without a code change.
 *
 * `of()` normalizes (trim + lowercase) and validates the *format*; membership in
 * a concrete taxonomy is a separate concern owned by {@link CategoryRegistry}.
 * The enum stays as the canonical seed of core slugs (`CORE_CATEGORY_SLUGS`).
 */
export class CategorySlug {
  private constructor(public readonly value: string) {}

  static of(value: string): CategorySlug {
    const normalized =
      typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized.length === 0) {
      throw new CategoryValidationError('Category slug must not be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new CategoryValidationError(
        `Category slug must be at most ${MAX_LENGTH} characters`,
      );
    }
    if (!SLUG_RE.test(normalized)) {
      throw new CategoryValidationError(
        `Category slug "${value}" must be a lowercase snake_case token (^[a-z][a-z0-9_]*$)`,
      );
    }
    return new CategorySlug(normalized);
  }

  equals(o: CategorySlug): boolean {
    return this.value === o.value;
  }

  toString(): string {
    return this.value;
  }
}
