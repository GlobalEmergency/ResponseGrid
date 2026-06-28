import { ShipmentItemValidationError } from './shipment-errors';

/**
 * A line in a shipment's cargo: what moves and how much. Mirrors {@link NeedItem}
 * in the needs context, but every field except `description` is optional —
 * cargo is often described loosely ("5 cajas de agua", "ropa surtida") and the
 * quantity/unit/category may be unknown at planning time.
 */
export interface ShipmentItemProps {
  description: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
}

export interface ShipmentItemSnapshot {
  description: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
}

export class ShipmentItem {
  readonly description: string;
  readonly quantity: number | null;
  readonly unit: string | null;
  readonly category: string | null;

  private constructor(s: ShipmentItemSnapshot) {
    this.description = s.description;
    this.quantity = s.quantity;
    this.unit = s.unit;
    this.category = s.category;
  }

  static create(props: ShipmentItemProps): ShipmentItem {
    const description = props.description?.trim() ?? '';
    if (description.length === 0) {
      throw new ShipmentItemValidationError(
        'ShipmentItem description must not be empty',
      );
    }
    const quantity = props.quantity ?? null;
    if (quantity !== null && !(quantity > 0)) {
      throw new ShipmentItemValidationError(
        'ShipmentItem quantity must be greater than 0 when provided',
      );
    }
    return new ShipmentItem({
      description,
      quantity,
      unit: props.unit ?? null,
      category: props.category ?? null,
    });
  }

  static fromSnapshot(s: ShipmentItemSnapshot): ShipmentItem {
    return new ShipmentItem(s);
  }

  toSnapshot(): ShipmentItemSnapshot {
    return {
      description: this.description,
      quantity: this.quantity,
      unit: this.unit,
      category: this.category,
    };
  }
}
