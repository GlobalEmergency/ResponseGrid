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

/**
 * Una categoría núcleo (slug del enum {@link Category}, referenciado por el
 * código y por otras tablas) está protegida: no se puede borrar ni archivar.
 * Error de negocio propio para que el mapeo HTTP (409) viva en el filtro y no
 * en el controller.
 */
export class CategoryProtectedError extends Error {
  constructor(slug: string) {
    super(`Core category is protected and cannot be deleted: ${slug}`);
    this.name = 'CategoryProtectedError';
  }
}
