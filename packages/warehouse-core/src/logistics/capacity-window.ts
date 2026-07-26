import { InvalidCapacityWindowError } from './transport-capacity-errors.js';

export interface CapacityWindowProps {
  /** Availability start (ISO-8601) or null for "no lower bound". */
  from: string | null;
  /** Availability end (ISO-8601) or null for "no upper bound". */
  to: string | null;
}

function parseIso(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new InvalidCapacityWindowError(
      `Capacity window ${field} must be a valid ISO date, got '${value}'`,
      'capacity_window_invalid_date',
    );
  }
  return date;
}

/**
 * Time window during which the capacity is on offer. Both ends are optional; an
 * empty window (no bounds) means "open-ended availability". When both are
 * present, `from` must not be after `to`.
 */
export class CapacityWindow {
  readonly from: string | null;
  readonly to: string | null;

  private constructor(props: CapacityWindowProps) {
    this.from = props.from;
    this.to = props.to;
  }

  static create(props: CapacityWindowProps): CapacityWindow {
    const from = props.from ?? null;
    const to = props.to ?? null;

    const fromDate = from !== null ? parseIso(from, 'from') : null;
    const toDate = to !== null ? parseIso(to, 'to') : null;

    if (fromDate !== null && toDate !== null && fromDate > toDate) {
      throw new InvalidCapacityWindowError(
        `Capacity window 'from' (${from}) must not be after 'to' (${to})`,
        'capacity_window_order_invalid',
      );
    }

    return new CapacityWindow({
      from: fromDate !== null ? fromDate.toISOString() : null,
      to: toDate !== null ? toDate.toISOString() : null,
    });
  }

  static empty(): CapacityWindow {
    return new CapacityWindow({ from: null, to: null });
  }

  toPlain(): CapacityWindowProps {
    return { from: this.from, to: this.to };
  }
}
