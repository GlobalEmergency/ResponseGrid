import { randomUUID } from 'node:crypto';
import {
  SupplyLine,
  SupplyLineProps,
  SupplyLineSnapshot,
} from '../../supplies/domain/supply-line';

/** Persisted intake row: shared {@link SupplyLine} + id and display order. */
export interface IntakeLineSnapshot extends SupplyLineSnapshot {
  id: string;
  sortOrder: number;
}

export interface IntakeLineProps {
  id?: string;
  sortOrder: number;
  line: SupplyLineProps;
}

export class IntakeLine {
  private constructor(
    public readonly id: string,
    public readonly sortOrder: number,
    public readonly supplyLine: SupplyLine,
  ) {}

  static create(props: IntakeLineProps): IntakeLine {
    return new IntakeLine(
      props.id ?? randomUUID(),
      props.sortOrder,
      SupplyLine.create(props.line),
    );
  }

  static fromSnapshot(s: IntakeLineSnapshot): IntakeLine {
    return new IntakeLine(
      s.id,
      s.sortOrder,
      SupplyLine.fromSnapshot({
        name: s.name,
        quantity: s.quantity,
        unit: s.unit,
        category: s.category,
        presentation: s.presentation ?? null,
        expiresAt: s.expiresAt ?? null,
      }),
    );
  }

  toSnapshot(): IntakeLineSnapshot {
    return {
      id: this.id,
      sortOrder: this.sortOrder,
      ...this.supplyLine.toSnapshot(),
    };
  }
}
