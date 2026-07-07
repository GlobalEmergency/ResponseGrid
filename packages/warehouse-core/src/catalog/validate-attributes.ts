import { AttributeDefinition } from './attribute-definition.js';
import { AttributeValidationError } from './supply-errors.js';

/**
 * Valor de atributo tras validar/coaccionar: la unidad se transporta junto al
 * valor numérico para los tipos `quantity` (magnitud + unidad declarada por la
 * definición). El resto de tipos guardan el valor escalar directamente.
 */
export interface QuantityValue {
  value: number;
  unit: string | null;
}

/**
 * validateAttributes — servicio puro (#396). Valida y coacciona el objeto
 * `attributes` de un `Supply` contra el **esquema efectivo** de su familia
 * (resuelto por {@link resolveEffectiveSchema}).
 *
 * Comprueba, acumulando TODAS las claves ofensoras antes de fallar:
 * - **requerido**: toda definición `required` debe estar presente (no
 *   `null`/`undefined`/cadena vacía);
 * - **tipo**: cada valor casa (o se coacciona sensatamente desde `string`) a su
 *   `dataType` — `number`/`integer`/`boolean`/`date`/`quantity`;
 * - **enum**: el valor está entre las `options` de la definición;
 * - **unidad**: para `quantity`, si la definición declara `unit`, el valor puede
 *   traer su propia unidad pero debe coincidir; se normaliza a `{ value, unit }`;
 * - **clave desconocida**: una clave sin definición en el esquema se rechaza.
 *
 * Si el esquema está vacío (familia sin definiciones), los atributos pasan tal
 * cual (comportamiento actual del catálogo libre). Devuelve el objeto validado/
 * normalizado; lanza {@link AttributeValidationError} listando las claves malas.
 */
export function validateAttributes(
  attributes: Record<string, unknown>,
  effectiveSchema: readonly AttributeDefinition[],
): Record<string, unknown> {
  const input = attributes ?? {};

  // Familia sin esquema: passthrough (catálogo libre, sin gobierno).
  if (effectiveSchema.length === 0) {
    return { ...input };
  }

  const defByKey = new Map(effectiveSchema.map((d) => [d.key, d]));
  const validated: Record<string, unknown> = {};
  const offending: string[] = [];
  const details: string[] = [];

  const flag = (key: string, detail: string): void => {
    if (!offending.includes(key)) offending.push(key);
    details.push(`${key}: ${detail}`);
  };

  // Claves desconocidas (no definidas en el esquema efectivo).
  for (const key of Object.keys(input)) {
    if (!defByKey.has(key) && !isEmpty(input[key])) {
      flag(key, 'unknown attribute for this category');
    }
  }

  for (const def of effectiveSchema) {
    const raw = input[def.key];

    if (isEmpty(raw)) {
      if (def.required) {
        flag(def.key, 'required attribute is missing');
      }
      continue;
    }

    try {
      validated[def.key] = coerce(def, raw);
    } catch (err) {
      flag(def.key, err instanceof Error ? err.message : 'invalid value');
    }
  }

  if (offending.length > 0) {
    throw new AttributeValidationError(offending, details.join('; '));
  }

  return validated;
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

function coerce(def: AttributeDefinition, raw: unknown): unknown {
  switch (def.dataType) {
    case 'text':
      return coerceText(raw);
    case 'number':
      return coerceNumber(raw, false);
    case 'integer':
      return coerceNumber(raw, true);
    case 'boolean':
      return coerceBoolean(raw);
    case 'date':
      return coerceDate(raw);
    case 'enum':
      return coerceEnum(def, raw);
    case 'quantity':
      return coerceQuantity(def, raw);
  }
}

function coerceText(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  throw new Error('expected a text value');
}

function coerceNumber(raw: unknown, integer: boolean): number {
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    n = Number(raw.trim());
  } else {
    throw new Error(`expected a ${integer ? 'integer' : 'number'}`);
  }
  if (!Number.isFinite(n)) {
    throw new Error(`expected a ${integer ? 'integer' : 'number'}`);
  }
  if (integer && !Number.isInteger(n)) {
    throw new Error('expected an integer');
  }
  return n;
}

function coerceBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  if (raw === 1) return true;
  if (raw === 0) return false;
  throw new Error('expected a boolean');
}

function coerceDate(raw: unknown): string {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) throw new Error('expected a valid date');
    return raw.toISOString();
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const d = new Date(raw.trim());
    if (Number.isNaN(d.getTime())) throw new Error('expected a valid date');
    return d.toISOString();
  }
  throw new Error('expected a valid date');
}

function coerceEnum(def: AttributeDefinition, raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : String(raw);
  const allowed = (def.options ?? []).map((o) => o.value);
  if (!allowed.includes(value)) {
    throw new Error(`value must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

function coerceQuantity(def: AttributeDefinition, raw: unknown): QuantityValue {
  // Acepta un escalar (magnitud, hereda la unidad de la definición) o un objeto
  // { value, unit } (la unidad debe coincidir con la declarada, si la hay).
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'value' in (raw as Record<string, unknown>)
  ) {
    const obj = raw as Record<string, unknown>;
    const value = coerceNumber(obj.value, false);
    const givenUnit =
      obj.unit === undefined || obj.unit === null
        ? null
        : String(obj.unit).trim();
    if (def.unit !== null && givenUnit !== null && givenUnit !== def.unit) {
      throw new Error(
        `unit "${givenUnit}" does not match the declared unit "${def.unit}"`,
      );
    }
    return { value, unit: def.unit ?? givenUnit };
  }
  const value = coerceNumber(raw, false);
  return { value, unit: def.unit };
}
