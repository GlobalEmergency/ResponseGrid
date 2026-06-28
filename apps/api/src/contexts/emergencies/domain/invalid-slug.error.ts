/**
 * Raised by {@link Slug.fromString} when the input is not a canonical slug
 * (lowercase letters, digits and single hyphens). It is a typed domain error so
 * the HTTP layer can map it deliberately (a public by-slug lookup treats it as
 * "not found" → 404) instead of letting a plain `Error` surface as a 500.
 */
export class InvalidSlugError extends Error {
  constructor(public readonly slug: string) {
    super(`Invalid slug: "${slug}"`);
    this.name = 'InvalidSlugError';
  }
}
