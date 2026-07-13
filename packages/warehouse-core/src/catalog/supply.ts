import {
  ExternalCodes,
  normalizeExternalCodes,
} from '../kernel/external-codes.js';

export type SupplyStatus = 'active' | 'archived';

/**
 * Clasificación fina de un insumo por su naturaleza logística (#269). Vive en el
 * INSUMO, no en la categoría (una categoría puede mezclar naturalezas). Enum
 * extensible (no boolean) para poder crecer sin una migración destructiva:
 * - `fungible`: se consume (gasas, agua).
 * - `reusable`: no se consume, se presta/devuelve (maquinaria, equipos).
 * - `human`: se asigna, no es carga (personal).
 *
 * `null` = sin clasificar (los insumos previos no se rellenan).
 */
export type SupplyNature = 'fungible' | 'reusable' | 'human';

export const SUPPLY_NATURES: readonly SupplyNature[] = [
  'fungible',
  'reusable',
  'human',
] as const;

export function isSupplyNature(x: unknown): x is SupplyNature {
  return (
    typeof x === 'string' && (SUPPLY_NATURES as readonly string[]).includes(x)
  );
}

export interface SupplyProps {
  id: string;
  code: string;
  name: string;
  categorySlug: string;
  defaultUnit: string | null;
  attributes?: Record<string, unknown> | null;
  variantOfId?: string | null;
  status?: SupplyStatus;
  registrationNotes?: string | null;
  /** Tenencia (#397): null = insumo global · set = insumo de un tenant. */
  scopeId?: string | null;
  /** Naturaleza logística (#269): null = sin clasificar (por defecto). */
  nature?: SupplyNature | null;
  /**
   * Códigos externos estándar para interop (#398): mapa abierto
   * namespace→código (`{ unspsc: '51101500', … }`). Por defecto `{}`.
   */
  externalCodes?: Record<string, string> | null;
}

export interface SupplySnapshot {
  id: string;
  code: string;
  name: string;
  categorySlug: string;
  defaultUnit: string | null;
  attributes: Record<string, unknown>;
  variantOfId: string | null;
  status: SupplyStatus;
  registrationNotes: string | null;
  scopeId: string | null;
  nature: SupplyNature | null;
  externalCodes: ExternalCodes;
}

export class SupplyValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'SupplyValidationError';
  }
}

function normalizeRequiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new SupplyValidationError(`${field} must not be empty`);
  }
  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

export class Supply {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly categorySlug: string;
  readonly defaultUnit: string | null;
  readonly attributes: Record<string, unknown>;
  readonly variantOfId: string | null;
  readonly status: SupplyStatus;
  readonly registrationNotes: string | null;
  readonly scopeId: string | null;
  readonly nature: SupplyNature | null;
  readonly externalCodes: ExternalCodes;

  private constructor(props: SupplyProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.categorySlug = props.categorySlug;
    this.defaultUnit = props.defaultUnit;
    this.attributes = { ...(props.attributes ?? {}) };
    this.variantOfId = props.variantOfId ?? null;
    this.status = props.status ?? 'active';
    this.registrationNotes = props.registrationNotes ?? null;
    this.scopeId = props.scopeId ?? null;
    this.nature = props.nature ?? null;
    this.externalCodes = { ...(props.externalCodes ?? {}) };
  }

  static create(props: SupplyProps): Supply {
    const id = normalizeRequiredText(props.id, 'Supply id');
    const code = normalizeRequiredText(props.code, 'Supply code');
    if (!/^[A-Z]{3}-\d{4}$/.test(code)) {
      throw new SupplyValidationError(
        'Supply code must match the XXX-NNNN format (3-letter uppercase prefix and 4 digits)',
      );
    }
    const name = normalizeRequiredText(props.name, 'Supply name');
    const categorySlug = normalizeRequiredText(
      props.categorySlug,
      'Supply categorySlug',
    );
    const defaultUnit = normalizeOptionalText(props.defaultUnit);
    const variantOfId = normalizeOptionalText(props.variantOfId);
    const registrationNotes = normalizeOptionalText(props.registrationNotes);
    const scopeId = normalizeOptionalText(props.scopeId);
    const status = props.status ?? 'active';
    if (status !== 'active' && status !== 'archived') {
      throw new SupplyValidationError(
        'Supply status must be active or archived',
      );
    }
    const nature = props.nature ?? null;
    if (nature !== null && !isSupplyNature(nature)) {
      throw new SupplyValidationError(
        `Supply nature must be one of: ${SUPPLY_NATURES.join(', ')}`,
      );
    }
    const externalCodes = normalizeExternalCodes(props.externalCodes);

    return new Supply({
      id,
      code,
      name,
      categorySlug,
      defaultUnit,
      attributes: props.attributes ?? {},
      variantOfId,
      status,
      registrationNotes,
      scopeId,
      nature,
      externalCodes,
    });
  }

  static fromSnapshot(s: SupplySnapshot): Supply {
    return new Supply({
      id: s.id,
      code: s.code,
      name: s.name,
      categorySlug: s.categorySlug,
      defaultUnit: s.defaultUnit,
      attributes: s.attributes,
      variantOfId: s.variantOfId,
      status: s.status,
      registrationNotes: s.registrationNotes,
      scopeId: s.scopeId,
      nature: s.nature,
      externalCodes: s.externalCodes,
    });
  }

  toSnapshot(): SupplySnapshot {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      categorySlug: this.categorySlug,
      defaultUnit: this.defaultUnit,
      attributes: { ...this.attributes },
      variantOfId: this.variantOfId,
      status: this.status,
      registrationNotes: this.registrationNotes,
      scopeId: this.scopeId,
      nature: this.nature,
      externalCodes: { ...this.externalCodes },
    };
  }

  /**
   * Devuelve un nuevo `Supply` con los campos indicados sobreescritos,
   * re-aplicando las invariantes de `create`. El agregado es inmutable: la
   * gestión (edición admin, #222) produce instancias nuevas en vez de mutar.
   * `id` y `code` no son editables (la identidad y el código asignado se
   * conservan).
   */
  private withChanges(
    changes: Partial<Omit<SupplyProps, 'id' | 'code'>>,
  ): Supply {
    return Supply.create({ ...this.toSnapshot(), ...changes });
  }

  rename(name: string): Supply {
    return this.withChanges({ name });
  }

  recategorize(categorySlug: string): Supply {
    return this.withChanges({ categorySlug });
  }

  setDefaultUnit(defaultUnit: string | null): Supply {
    return this.withChanges({ defaultUnit });
  }

  setAttributes(attributes: Record<string, unknown>): Supply {
    return this.withChanges({ attributes });
  }

  setRegistrationNotes(registrationNotes: string | null): Supply {
    return this.withChanges({ registrationNotes });
  }

  setVariantOf(variantOfId: string | null): Supply {
    return this.withChanges({ variantOfId });
  }

  /**
   * Reclasifica el insumo por su naturaleza logística (#269). `null` lo deja sin
   * clasificar. Inmutable: produce una instancia nueva vía `withChanges`.
   */
  reclassify(nature: SupplyNature | null): Supply {
    return this.withChanges({ nature });
  }

  /**
   * Reemplaza el mapa de códigos externos de interop (#398). El mapa se
   * normaliza y valida en `create` (vía `withChanges`); un mapa vacío los
   * limpia. Inmutable: produce una instancia nueva.
   */
  setExternalCodes(externalCodes: Record<string, string>): Supply {
    return this.withChanges({ externalCodes });
  }

  archive(): Supply {
    return this.withChanges({ status: 'archived' });
  }

  restore(): Supply {
    return this.withChanges({ status: 'active' });
  }

  /**
   * Actualiza el código de este insumo reemplazando el prefijo actual por uno nuevo,
   * manteniendo el número secuencial intacto.
   */
  updateCodePrefix(newPrefix: string): Supply {
    const parts = this.code.split('-');
    const sequence = parts[1] ?? '0000';
    const newCode = `${newPrefix}-${sequence}`;
    if (newCode === this.code) {
      return this;
    }
    return Supply.create({
      ...this.toSnapshot(),
      code: newCode,
    });
  }
}

/**
 * Formatea un número de secuencia como código canónico `XXX-NNNN` (4 dígitos,
 * la invariante que valida `Supply`). Puro: la secuencia la asigna el
 * repositorio (infraestructura); esto sólo da formato.
 */
export function formatSupplyCode(prefix: string, sequence: number): string {
  if (!/^[A-Z]{3}$/.test(prefix)) {
    throw new SupplyValidationError(
      'Supply code prefix must be a 3-letter uppercase string',
    );
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new SupplyValidationError(
      'Supply code sequence must be a positive integer',
    );
  }
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}
