import { CategorySlug } from './category-slug.js';

/**
 * SupplyLine — the core "line of aid material" of the platform: a quantity of a
 * supply (insumo) in a given category and unit.
 *
 * The same value object models a line of material wherever it appears:
 *  - what a need (petición) requests,
 *  - what a place holds in stock (resource inventory),
 *  - what an offer commits to deliver,
 *  - and, in the future, what a container (pallet/box/lote) groups.
 *
 * It lives in the supplies (insumos) context — an upstream, supporting domain
 * that needs/offers/resources depend on — so categories and per-line parameters
 * stay consistent everywhere. `presentation` (route of administration:
 * ampolla/EV/inhalador…) is the integrated per-line parameter for the health
 * vertical (#61); it is optional and free-form. `expiresAt` is the optional
 * per-line freshness date used by inventory and donation intake.
 *
 * For now a SupplyLine carries the supply's name inline (free text). It is
 * designed to later reference a catalog `Supply` by id (master data) without
 * changing its consumers.
 */
export interface SupplyLineProps {
  name: string;
  quantity: number;
  unit: string | null;
  /**
   * Slug de categoría (data-driven). Se valida el *formato* con
   * {@link CategorySlug} en {@link SupplyLine.create}; la pertenencia a la
   * taxonomía concreta (tabla `categories` / `CategoryRegistry`) es
   * responsabilidad del host, no del value object.
   */
  category: string;
  supplyId?: string | null;
  presentation?: string | null;
  expiresAt?: string | null;
}

export interface SupplyLineSnapshot {
  name: string;
  quantity: number;
  unit: string | null;
  /** Slug de categoría (data-driven) ya normalizado. */
  category: string;
  /** Soft link to the canonical supply master data, or null when absent. */
  supplyId: string | null;
  /** Optional (legacy-safe) presentation / route of administration (#61). */
  presentation?: string | null;
  /** Optional freshness date for the line, kept as an ISO date string. */
  expiresAt?: string | null;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeDateOnly(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const errorMessage = 'SupplyLine expiresAt must be a valid YYYY-MM-DD date';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new SupplyLineValidationError(errorMessage, 'supply_expiry_invalid');
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== trimmed
  ) {
    throw new SupplyLineValidationError(errorMessage, 'supply_expiry_invalid');
  }
  return trimmed;
}

/**
 * Stable, machine-readable identifier for each SupplyLine validation failure
 * (#348). Consumers (e.g. the web's `localizeBackendError`) should key
 * localized copy off `code`, not off `.message` prose, so a wording change
 * here can't silently degrade the client to a generic error.
 */
export type SupplyLineErrorCode =
  | 'supply_name_required'
  | 'supply_quantity_invalid'
  | 'supply_expiry_invalid';

export class SupplyLineValidationError extends Error {
  constructor(
    msg: string,
    public readonly code: SupplyLineErrorCode,
  ) {
    super(msg);
    this.name = 'SupplyLineValidationError';
  }
}

export class SupplyLine {
  readonly name: string;
  readonly quantity: number;
  readonly unit: string | null;
  readonly category: string;
  readonly supplyId: string | null;
  readonly presentation: string | null;
  readonly expiresAt: string | null;

  private constructor(props: SupplyLineProps) {
    this.name = props.name;
    this.quantity = props.quantity;
    this.unit = props.unit;
    this.category = props.category;
    this.supplyId = normalizeOptionalText(props.supplyId);
    this.presentation = props.presentation ?? null;
    this.expiresAt = normalizeDateOnly(props.expiresAt);
  }

  static create(props: SupplyLineProps): SupplyLine {
    if (!props.name || props.name.trim().length === 0) {
      throw new SupplyLineValidationError(
        'SupplyLine name must not be empty',
        'supply_name_required',
      );
    }
    if (!Number.isInteger(props.quantity) || props.quantity < 1) {
      throw new SupplyLineValidationError(
        'SupplyLine quantity must be a positive integer',
        'supply_quantity_invalid',
      );
    }
    // Valida el *formato* del slug (trim + lowercase + snake_case) y lo
    // normaliza. La pertenencia a la taxonomía es cosa del host.
    const category = CategorySlug.of(props.category).value;
    return new SupplyLine({
      name: props.name.trim(),
      quantity: props.quantity,
      unit: props.unit ?? null,
      category,
      supplyId: props.supplyId ?? null,
      presentation: props.presentation ?? null,
      expiresAt: props.expiresAt ?? null,
    });
  }

  static fromSnapshot(s: SupplyLineSnapshot): SupplyLine {
    return new SupplyLine(s);
  }

  toSnapshot(): SupplyLineSnapshot {
    return {
      name: this.name,
      quantity: this.quantity,
      unit: this.unit,
      category: this.category,
      supplyId: this.supplyId,
      presentation: this.presentation,
      expiresAt: this.expiresAt,
    };
  }
}
