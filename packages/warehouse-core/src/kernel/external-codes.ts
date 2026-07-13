/**
 * ExternalCodes — un mapa ABIERTO de códigos externos estándar para interop
 * (mapeable/compatible, SIN acoplarse a ningún estándar concreto): #398.
 *
 * Las claves son slugs de namespace (`unspsc`, `who_eml`, `hxl`, …) con el
 * mismo formato snake_case que un slug de categoría (`^[a-z][a-z0-9_]*$`); los
 * valores son cadenas no vacías (el código en ese estándar). Ej.:
 * `{ unspsc: '51101500', who_eml: '…', hxl: '#item+code' }`.
 *
 * Vive en el `kernel` porque lo comparten `Supply` (catalog) y
 * `CategoryDefinition` (kernel), y el kernel no puede importar catalog (evitaría
 * un ciclo). Mapa vacío `{}` = sin códigos (por defecto). No fija el conjunto de
 * llaves permitidas: los estándares crecen por datos, sin migración de código.
 */
export type ExternalCodes = Record<string, string>;

const NAMESPACE_RE = /^[a-z][a-z0-9_]*$/;
const MAX_NAMESPACE_LENGTH = 64;

export class ExternalCodesValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ExternalCodesValidationError';
  }
}

/**
 * ¿Es `x` un slug de namespace válido (`^[a-z][a-z0-9_]*$`, ≤64 chars)? Guard
 * puro, sin efectos: la membresía en un estándar concreto no es su incumbencia.
 */
export function isExternalCodeNamespace(x: unknown): x is string {
  return (
    typeof x === 'string' &&
    x.length <= MAX_NAMESPACE_LENGTH &&
    NAMESPACE_RE.test(x)
  );
}

/**
 * Normaliza y valida un mapa de códigos externos: claves = slug de namespace
 * (se recortan; deben cumplir el formato), valores = cadena no vacía (se
 * recortan). `null`/`undefined` → `{}`. Rechaza claves o valores inválidos con
 * `ExternalCodesValidationError`. Devuelve un `Record<string,string>` nuevo.
 */
export function normalizeExternalCodes(
  map: Record<string, unknown> | null | undefined,
): ExternalCodes {
  if (map === null || map === undefined) {
    return {};
  }
  if (typeof map !== 'object' || Array.isArray(map)) {
    throw new ExternalCodesValidationError(
      'External codes must be an object mapping namespace to code',
    );
  }
  const normalized: ExternalCodes = {};
  for (const [rawKey, rawValue] of Object.entries(map)) {
    const key = rawKey.trim();
    if (!isExternalCodeNamespace(key)) {
      throw new ExternalCodesValidationError(
        `External code namespace "${rawKey}" must be a lowercase snake_case token (^[a-z][a-z0-9_]*$)`,
      );
    }
    if (typeof rawValue !== 'string') {
      throw new ExternalCodesValidationError(
        `External code for "${key}" must be a string`,
      );
    }
    const value = rawValue.trim();
    if (value.length === 0) {
      throw new ExternalCodesValidationError(
        `External code for "${key}" must not be empty`,
      );
    }
    normalized[key] = value;
  }
  return normalized;
}
