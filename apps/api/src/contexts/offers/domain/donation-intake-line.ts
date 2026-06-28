import { randomUUID } from 'node:crypto';
import { NeedCategory } from './offer-enums';

export interface DonationIntakeLineProps {
  id?: string;
  category: NeedCategory;
  description: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface DonationIntakeLineSnapshot {
  id: string;
  category: NeedCategory;
  description: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  sortOrder: number;
}

export class DonationIntakeLine {
  private constructor(
    public readonly id: string,
    public readonly category: NeedCategory,
    public readonly description: string,
    public readonly quantity: number,
    public readonly unit: string | null,
    public readonly notes: string | null,
    public readonly sortOrder: number,
  ) {}

  static create(props: DonationIntakeLineProps): DonationIntakeLine {
    const description = props.description.trim();
    if (!description) {
      throw new Error('Line description is required');
    }
    if (props.quantity <= 0) {
      throw new Error('Line quantity must be greater than 0');
    }

    return new DonationIntakeLine(
      props.id ?? randomUUID(),
      props.category,
      description,
      props.quantity,
      props.unit?.trim() ? props.unit.trim() : null,
      props.notes?.trim() ? props.notes.trim() : null,
      props.sortOrder,
    );
  }

  static fromSnapshot(s: DonationIntakeLineSnapshot): DonationIntakeLine {
    return new DonationIntakeLine(
      s.id,
      s.category,
      s.description,
      s.quantity,
      s.unit,
      s.notes,
      s.sortOrder,
    );
  }

  toSnapshot(): DonationIntakeLineSnapshot {
    return {
      id: this.id,
      category: this.category,
      description: this.description,
      quantity: this.quantity,
      unit: this.unit,
      notes: this.notes,
      sortOrder: this.sortOrder,
    };
  }
}
