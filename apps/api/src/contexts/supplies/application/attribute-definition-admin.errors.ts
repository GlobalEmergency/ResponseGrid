/**
 * Error de gestión del metamodelo de atributos (#396): la definición
 * (categoría + key, scope global) no existe al archivarla. El filtro HTTP lo
 * mapea a 404.
 */
export class AttributeDefinitionNotFoundError extends Error {
  constructor(categorySlug: string, key: string) {
    super(`Attribute definition not found: ${categorySlug}.${key}`);
    this.name = 'AttributeDefinitionNotFoundError';
  }
}
