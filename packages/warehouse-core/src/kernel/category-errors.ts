/**
 * Raised when a category slug is malformed — empty, too long, or not a
 * lowercase `snake_case` token (`^[a-z][a-z0-9_]*$`). The HTTP layer of each
 * host maps it to 422.
 */
export class CategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryValidationError';
  }
}

/**
 * Raised when a slug is not present in a {@link CategoryRegistry} that was asked
 * to resolve it. The registry is the data-driven source of truth for which
 * categories exist, so an unknown slug is a lookup miss, not a format error.
 */
export class UnknownCategoryError extends Error {
  constructor(slug: string) {
    super(`Unknown category slug: ${slug}`);
    this.name = 'UnknownCategoryError';
  }
}
