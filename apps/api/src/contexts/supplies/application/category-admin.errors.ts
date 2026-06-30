export class CategoryNotFoundError extends Error {
  constructor(slug: string) {
    super(`Category not found: ${slug}`);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Category already exists: ${slug}`);
    this.name = 'CategoryAlreadyExistsError';
  }
}

export class CategoryParentNotFoundError extends Error {
  constructor(slug: string) {
    super(`Parent category not found: ${slug}`);
    this.name = 'CategoryParentNotFoundError';
  }
}

export class CategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryValidationError';
  }
}
