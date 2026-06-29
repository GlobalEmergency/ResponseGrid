export type SupplyStatus = 'active' | 'archived';

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
    const categorySlug = normalizeRequiredText(
      props.categorySlug,
      'Supply categorySlug',
    );
    const defaultUnit = normalizeOptionalText(props.defaultUnit);
    const variantOfId = normalizeOptionalText(props.variantOfId);
    const registrationNotes = normalizeOptionalText(props.registrationNotes);
    const status = props.status ?? 'active';
    if (status !== 'active' && status !== 'archived') {
      throw new SupplyValidationError(
        'Supply status must be active or archived',
      );
    }

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
    };
  }
}
