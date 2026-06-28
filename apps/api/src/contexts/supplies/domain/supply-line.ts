import { Category } from './category';

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
 * vertical (#61); it is optional and free-form.
 *
 * For now a SupplyLine carries the supply's name inline (free text). It is
 * designed to later reference a catalog `Supply` by id (master data) without
 * changing its consumers.
 */
export interface SupplyLineProps {
  name: string;
  quantity: number;
  unit: string | null;
  category: Category;
  presentation?: string | null;
}

export interface SupplyLineSnapshot {
  name: string;
  quantity: number;
  unit: string | null;
  category: Category;
  /** Optional (legacy-safe) presentation / route of administration (#61). */
  presentation?: string | null;
}

export class SupplyLineValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'SupplyLineValidationError';
  }
}

export class SupplyLine {
  readonly name: string;
  readonly quantity: number;
  readonly unit: string | null;
  readonly category: Category;
  readonly presentation: string | null;

  private constructor(props: SupplyLineProps) {
    this.name = props.name;
    this.quantity = props.quantity;
    this.unit = props.unit;
    this.category = props.category;
    this.presentation = props.presentation ?? null;
  }

  static create(props: SupplyLineProps): SupplyLine {
    if (!props.name || props.name.trim().length === 0) {
      throw new SupplyLineValidationError('SupplyLine name must not be empty');
    }
    if (!Number.isInteger(props.quantity) || props.quantity < 1) {
      throw new SupplyLineValidationError(
        'SupplyLine quantity must be a positive integer',
      );
    }
    return new SupplyLine({
      name: props.name.trim(),
      quantity: props.quantity,
      unit: props.unit ?? null,
      category: props.category,
      presentation: props.presentation ?? null,
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
      presentation: this.presentation,
    };
  }
}
