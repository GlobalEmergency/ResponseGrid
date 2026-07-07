/**
 * Helpers para clasificar errores crudos del driver `pg` por su `code`
 * (SQLSTATE), sin acoplar los repositorios a la forma interna del error.
 */

/** SQLSTATE de violación de unicidad (unique_violation). */
const UNIQUE_VIOLATION = '23505';

/**
 * True si el error (o algún error de su cadena `cause`) es una violación de
 * índice/constraint único (`23505`). Drizzle envuelve el error crudo del driver
 * en un `DrizzleQueryError`, así que el `code` de Postgres no está en el error de
 * nivel superior sino en `.cause`; por eso se recorre la cadena (con un tope de
 * profundidad como guarda anti-ciclos).
 */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 8; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
