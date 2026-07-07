/**
 * AttributeDefinition — el metamodelo del catálogo maestro escalable (#396,
 * épica #228). "Una tabla que describe tablas": un admin define, en runtime y
 * sin desplegar, los campos tipados que caracterizan a una familia de insumos.
 *
 * La "familia" es un nodo de la `Category` (con herencia por el árbol): un
 * `AttributeDefinition` se ancla a `categorySlug` y aplica a esa categoría y a
 * toda su descendencia (la fusión la resuelve {@link resolveEffectiveSchema}).
 *
 * Agregado inmutable con invariantes (patrón `withChanges` como `Supply`):
 * - `key` no vacía y con formato slug (`^[a-z][a-z0-9_]*$`);
 * - `dataType` válido;
 * - `options` sólo para `enum` (y no vacío para `enum`);
 * - `unit` sólo para `number`/`quantity`.
 *
 * Inc 1: `scopeId` siempre `null` (global). La columna existe para que la
 * tenencia (Inc 2) la use sin tocar consumidores (OCP/DIP).
 */

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const KEY_MAX_LENGTH = 64;

export const ATTRIBUTE_DATA_TYPES = [
  'text',
  'number',
  'integer',
  'boolean',
  'enum',
  'date',
  'quantity',
] as const;

export type AttributeDataType = (typeof ATTRIBUTE_DATA_TYPES)[number];

/** Los tipos que llevan `unit` (magnitudes numéricas). */
const UNIT_DATA_TYPES: readonly AttributeDataType[] = ['number', 'quantity'];

export interface AttributeOption {
  value: string;
  label?: string;
}

export interface AttributeDefinitionProps {
  categorySlug: string;
  key: string;
  dataType: AttributeDataType;
  required?: boolean;
  options?: readonly AttributeOption[] | null;
  unit?: string | null;
  sort?: number;
  scopeId?: string | null;
  archivedAt?: Date | null;
}

export interface AttributeDefinitionSnapshot {
  categorySlug: string;
  key: string;
  dataType: AttributeDataType;
  required: boolean;
  options: AttributeOption[] | null;
  unit: string | null;
  sort: number;
  scopeId: string | null;
  archivedAt: Date | null;
}

export class AttributeDefinitionValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'AttributeDefinitionValidationError';
  }
}

function isDataType(value: unknown): value is AttributeDataType {
  return (
    typeof value === 'string' &&
    (ATTRIBUTE_DATA_TYPES as readonly string[]).includes(value)
  );
}

function normalizeKey(value: string): string {
  const normalized =
    typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized.length === 0) {
    throw new AttributeDefinitionValidationError(
      'Attribute key must not be empty',
    );
  }
  if (normalized.length > KEY_MAX_LENGTH) {
    throw new AttributeDefinitionValidationError(
      `Attribute key must be at most ${KEY_MAX_LENGTH} characters`,
    );
  }
  if (!KEY_RE.test(normalized)) {
    throw new AttributeDefinitionValidationError(
      `Attribute key "${value}" must be a lowercase snake_case token (^[a-z][a-z0-9_]*$)`,
    );
  }
  return normalized;
}

function normalizeRequiredText(value: string, field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length === 0) {
    throw new AttributeDefinitionValidationError(`${field} must not be empty`);
  }
  return normalized;
}

function normalizeOptions(
  options: readonly AttributeOption[] | null | undefined,
): AttributeOption[] {
  if (!options || options.length === 0) {
    throw new AttributeDefinitionValidationError(
      'An enum attribute must declare at least one option',
    );
  }
  const seen = new Set<string>();
  const normalized: AttributeOption[] = [];
  for (const option of options) {
    const value = normalizeRequiredText(option.value, 'Attribute option value');
    if (seen.has(value)) {
      throw new AttributeDefinitionValidationError(
        `Duplicate enum option value: ${value}`,
      );
    }
    seen.add(value);
    const label =
      option.label === undefined || option.label === null
        ? undefined
        : option.label.trim();
    normalized.push(
      label !== undefined && label.length > 0 ? { value, label } : { value },
    );
  }
  return normalized;
}

export class AttributeDefinition {
  readonly categorySlug: string;
  readonly key: string;
  readonly dataType: AttributeDataType;
  readonly required: boolean;
  readonly options: AttributeOption[] | null;
  readonly unit: string | null;
  readonly sort: number;
  readonly scopeId: string | null;
  readonly archivedAt: Date | null;

  private constructor(snapshot: AttributeDefinitionSnapshot) {
    this.categorySlug = snapshot.categorySlug;
    this.key = snapshot.key;
    this.dataType = snapshot.dataType;
    this.required = snapshot.required;
    this.options = snapshot.options
      ? snapshot.options.map((o) => ({ ...o }))
      : null;
    this.unit = snapshot.unit;
    this.sort = snapshot.sort;
    this.scopeId = snapshot.scopeId;
    this.archivedAt = snapshot.archivedAt;
  }

  static create(props: AttributeDefinitionProps): AttributeDefinition {
    const categorySlug = normalizeRequiredText(
      props.categorySlug,
      'Attribute categorySlug',
    );
    const key = normalizeKey(props.key);

    if (!isDataType(props.dataType)) {
      throw new AttributeDefinitionValidationError(
        `Attribute dataType must be one of: ${ATTRIBUTE_DATA_TYPES.join(', ')}`,
      );
    }
    const dataType = props.dataType;

    let options: AttributeOption[] | null = null;
    if (dataType === 'enum') {
      options = normalizeOptions(props.options);
    } else if (props.options && props.options.length > 0) {
      throw new AttributeDefinitionValidationError(
        'options are only allowed for enum attributes',
      );
    }

    let unit: string | null = null;
    const rawUnit =
      props.unit === undefined || props.unit === null
        ? null
        : props.unit.trim();
    if (rawUnit !== null && rawUnit.length > 0) {
      if (!UNIT_DATA_TYPES.includes(dataType)) {
        throw new AttributeDefinitionValidationError(
          'unit is only allowed for number/quantity attributes',
        );
      }
      unit = rawUnit;
    }

    const sort = props.sort ?? 0;
    if (!Number.isInteger(sort)) {
      throw new AttributeDefinitionValidationError(
        'Attribute sort must be an integer',
      );
    }

    const scopeId =
      props.scopeId === undefined || props.scopeId === null
        ? null
        : normalizeRequiredText(props.scopeId, 'Attribute scopeId');

    return new AttributeDefinition({
      categorySlug,
      key,
      dataType,
      required: props.required ?? false,
      options,
      unit,
      sort,
      scopeId,
      archivedAt: props.archivedAt ?? null,
    });
  }

  static fromSnapshot(s: AttributeDefinitionSnapshot): AttributeDefinition {
    return new AttributeDefinition({
      ...s,
      options: s.options ? s.options.map((o) => ({ ...o })) : null,
    });
  }

  toSnapshot(): AttributeDefinitionSnapshot {
    return {
      categorySlug: this.categorySlug,
      key: this.key,
      dataType: this.dataType,
      required: this.required,
      options: this.options ? this.options.map((o) => ({ ...o })) : null,
      unit: this.unit,
      sort: this.sort,
      scopeId: this.scopeId,
      archivedAt: this.archivedAt,
    };
  }

  /**
   * Devuelve una nueva definición con los campos indicados sobreescritos,
   * re-aplicando las invariantes de `create`. Inmutable como `Supply`:
   * `categorySlug` y `key` (la identidad) no se editan.
   */
  private withChanges(
    changes: Partial<Omit<AttributeDefinitionProps, 'categorySlug' | 'key'>>,
  ): AttributeDefinition {
    return AttributeDefinition.create({ ...this.toSnapshot(), ...changes });
  }

  archive(archivedAt: Date): AttributeDefinition {
    return this.withChanges({ archivedAt });
  }

  restore(): AttributeDefinition {
    return this.withChanges({ archivedAt: null });
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }
}
