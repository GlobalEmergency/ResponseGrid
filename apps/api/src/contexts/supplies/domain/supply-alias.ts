import { normalizeSupplyText } from './supply-normalize';

export interface SupplyAliasProps {
  alias: string;
  supplyId: string;
}

export interface SupplyAliasSnapshot {
  alias: string;
  supplyId: string;
}

export class SupplyAliasValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'SupplyAliasValidationError';
  }
}

function normalizeRequiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new SupplyAliasValidationError(`${field} must not be empty`);
  }
  return normalized;
}

export class SupplyAlias {
  readonly alias: string;
  readonly supplyId: string;

  private constructor(props: SupplyAliasProps) {
    this.alias = props.alias;
    this.supplyId = props.supplyId;
  }

  static create(props: SupplyAliasProps): SupplyAlias {
    return new SupplyAlias({
      alias: normalizeRequiredText(props.alias, 'Supply alias'),
      supplyId: normalizeRequiredText(props.supplyId, 'Supply alias supplyId'),
    });
  }

  static fromSnapshot(s: SupplyAliasSnapshot): SupplyAlias {
    return new SupplyAlias(s);
  }

  toSnapshot(): SupplyAliasSnapshot {
    return {
      alias: this.alias,
      supplyId: this.supplyId,
    };
  }

  static normalize(alias: string): string {
    return normalizeSupplyText(alias);
  }
}
