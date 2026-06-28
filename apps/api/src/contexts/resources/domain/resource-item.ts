export interface ResourceItemProps {
  name: string;
  quantity: number;
  unit: string | null;
  /** Material category slug (e.g. 'water', 'food'). Same taxonomy as `accepts`. */
  category: string;
}

export interface ResourceItemSnapshot {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
}

export class ResourceItemValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ResourceItemValidationError';
  }
}

/**
 * A line of declared inventory held at a resource / place (qué material tiene
 * para entregar). Mirrors the shape of `NeedItem` (name/quantity/unit/category)
 * so the same UI and mental model are reused, enabling per-place inventory
 * control. Unlike a need item it has no medical `presentation` (out of MVP
 * scope) and the category is a free taxonomy slug, consistent with the
 * resource's `accepts` field.
 */
export class ResourceItem {
  readonly name: string;
  readonly quantity: number;
  readonly unit: string | null;
  readonly category: string;

  private constructor(props: ResourceItemProps) {
    this.name = props.name;
    this.quantity = props.quantity;
    this.unit = props.unit;
    this.category = props.category;
  }

  static create(props: ResourceItemProps): ResourceItem {
    if (!props.name || props.name.trim().length === 0) {
      throw new ResourceItemValidationError(
        'ResourceItem name must not be empty',
      );
    }
    if (!Number.isInteger(props.quantity) || props.quantity < 1) {
      throw new ResourceItemValidationError(
        'ResourceItem quantity must be a positive integer',
      );
    }
    if (!props.category || props.category.trim().length === 0) {
      throw new ResourceItemValidationError(
        'ResourceItem category must not be empty',
      );
    }
    return new ResourceItem({
      name: props.name.trim(),
      quantity: props.quantity,
      unit: props.unit ?? null,
      category: props.category.trim(),
    });
  }

  static fromSnapshot(s: ResourceItemSnapshot): ResourceItem {
    return new ResourceItem(s);
  }

  toSnapshot(): ResourceItemSnapshot {
    return {
      name: this.name,
      quantity: this.quantity,
      unit: this.unit,
      category: this.category,
    };
  }
}
