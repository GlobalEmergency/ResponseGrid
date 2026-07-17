import { normalizeSupplyText } from './supply-normalize.js';

export interface SupplyAliasProps {
  alias: string;
  supplyId: string;
  /** Tenencia (#397): null = alias global · set = alias de un tenant. */
  scopeId?: string | null;
}

export interface SupplyAliasSnapshot {
  alias: string;
  supplyId: string;
  scopeId: string | null;
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

function normalizeScopeId(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

export class SupplyAlias {
  readonly alias: string;
  readonly supplyId: string;
  readonly scopeId: string | null;

  private constructor(props: SupplyAliasProps) {
    this.alias = props.alias;
    this.supplyId = props.supplyId;
    this.scopeId = props.scopeId ?? null;
  }

  static create(props: SupplyAliasProps): SupplyAlias {
    return new SupplyAlias({
      alias: normalizeRequiredText(props.alias, 'Supply alias'),
      supplyId: normalizeRequiredText(props.supplyId, 'Supply alias supplyId'),
      scopeId: normalizeScopeId(props.scopeId),
    });
  }

  static fromSnapshot(s: SupplyAliasSnapshot): SupplyAlias {
    return new SupplyAlias(s);
  }

  toSnapshot(): SupplyAliasSnapshot {
    return {
      alias: this.alias,
      supplyId: this.supplyId,
      scopeId: this.scopeId,
    };
  }

  static normalize(alias: string): string {
    return normalizeSupplyText(alias);
  }
}
