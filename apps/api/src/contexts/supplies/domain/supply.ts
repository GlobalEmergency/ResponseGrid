import { Category } from './category';

export interface SupplyProps {
  id: string;
  code: string;
  name: string;
  category: Category;
  defaultUnit: string | null;
  attributes?: Record<string, unknown> | null;
  variantOfId?: string | null;
}

export interface SupplySnapshot {
  id: string;
  code: string;
  name: string;
  category: Category;
  defaultUnit: string | null;
  attributes: Record<string, unknown>;
  variantOfId: string | null;
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
  field: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new SupplyValidationError(`${field} must not be empty`);
  }
  return normalized;
}

export class Supply {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category: Category;
  readonly defaultUnit: string | null;
  readonly attributes: Record<string, unknown>;
  readonly variantOfId: string | null;

  private constructor(props: SupplyProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.category = props.category;
    this.defaultUnit = props.defaultUnit;
    this.attributes = { ...(props.attributes ?? {}) };
    this.variantOfId = props.variantOfId ?? null;
  }

  static create(props: SupplyProps): Supply {
    const id = normalizeRequiredText(props.id, 'Supply id');
    const code = normalizeRequiredText(props.code, 'Supply code');
    if (!/^INS-\d{4}$/.test(code)) {
      throw new SupplyValidationError(
        'Supply code must match the INS-NNNN format',
      );
    }
    const name = normalizeRequiredText(props.name, 'Supply name');
    const defaultUnit = normalizeOptionalText(
      props.defaultUnit,
      'Supply default unit',
    );
    const variantOfId = normalizeOptionalText(
      props.variantOfId,
      'Supply variantOfId',
    );

    return new Supply({
      id,
      code,
      name,
      category: props.category,
      defaultUnit,
      attributes: props.attributes ?? {},
      variantOfId,
    });
  }

  static fromSnapshot(s: SupplySnapshot): Supply {
    return new Supply({
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      defaultUnit: s.defaultUnit,
      attributes: s.attributes,
      variantOfId: s.variantOfId,
    });
  }

  toSnapshot(): SupplySnapshot {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      category: this.category,
      defaultUnit: this.defaultUnit,
      attributes: { ...this.attributes },
      variantOfId: this.variantOfId,
    };
  }
}
