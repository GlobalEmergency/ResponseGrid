import { NeedCategory } from './need-enums';

export interface NeedItemProps {
  name: string;
  quantity: number;
  unit: string | null;
  category: NeedCategory;
  /** Presentation / route of administration (ampolla, EV, inhalador…). Optional. */
  presentation?: string | null;
}

export interface NeedItemSnapshot {
  name: string;
  quantity: number;
  unit: string | null;
  category: NeedCategory;
  /** Optional (legacy-safe) presentation / route of administration (#61). */
  presentation?: string | null;
}

export class NeedItemValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'NeedItemValidationError';
  }
}

export class NeedItem {
  readonly name: string;
  readonly quantity: number;
  readonly unit: string | null;
  readonly category: NeedCategory;
  readonly presentation: string | null;

  private constructor(props: NeedItemProps) {
    this.name = props.name;
    this.quantity = props.quantity;
    this.unit = props.unit;
    this.category = props.category;
    this.presentation = props.presentation ?? null;
  }

  static create(props: NeedItemProps): NeedItem {
    if (!props.name || props.name.trim().length === 0) {
      throw new NeedItemValidationError('NeedItem name must not be empty');
    }
    if (!Number.isInteger(props.quantity) || props.quantity < 1) {
      throw new NeedItemValidationError(
        'NeedItem quantity must be a positive integer',
      );
    }
    return new NeedItem({
      name: props.name.trim(),
      quantity: props.quantity,
      unit: props.unit ?? null,
      category: props.category,
      presentation: props.presentation ?? null,
    });
  }

  static fromSnapshot(s: NeedItemSnapshot): NeedItem {
    return new NeedItem(s);
  }

  toSnapshot(): NeedItemSnapshot {
    return {
      name: this.name,
      quantity: this.quantity,
      unit: this.unit,
      category: this.category,
      presentation: this.presentation,
    };
  }
}
