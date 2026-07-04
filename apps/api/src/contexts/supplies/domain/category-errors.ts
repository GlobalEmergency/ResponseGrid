/**
 * Errores de dominio de la gestión de categorías (#221). Se lanzan desde los
 * casos de uso y los traduce a HTTP el `SuppliesDomainExceptionFilter` global
 * (no hay try/catch en el controller).
 */
export class CategoryNotFoundError extends Error {
  constructor(slug: string) {
    super(`Categoría no encontrada: ${slug}`);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Ya existe una categoría con el slug: ${slug}`);
    this.name = 'CategoryAlreadyExistsError';
  }
}

export class CategoryParentNotFoundError extends Error {
  constructor(slug: string) {
    super(`La categoría padre no existe: ${slug}`);
    this.name = 'CategoryParentNotFoundError';
  }
}

/**
 * Una categoría núcleo (slug del enum {@link Category}, referenciado por el
 * código y por otras tablas) no se puede borrar ni renombrar. Sí se puede
 * editar (etiquetas/orden/padre) y archivar vía PATCH.
 */
export class CategoryProtectedError extends Error {
  constructor(slug: string) {
    super(`La categoría núcleo no se puede borrar ni renombrar: ${slug}`);
    this.name = 'CategoryProtectedError';
  }
}

export class CategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryValidationError';
  }
}
