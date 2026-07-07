import {
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
} from './transport-capacity-errors.js';

export interface CapacityProps {
  weightKg: number | null;
  volumeM3: number | null;
}

/**
 * Transport capacity expressed as weight and/or volume. Invariant: at least one
 * of the two must be present and positive (a vehicle that can carry neither is
 * not a capacity offer). Either dimension may be omitted when the provider only
 * knows one of them.
 */
export class Capacity {
  readonly weightKg: number | null;
  readonly volumeM3: number | null;

  private constructor(props: CapacityProps) {
    this.weightKg = props.weightKg;
    this.volumeM3 = props.volumeM3;
  }

  static create(props: CapacityProps): Capacity {
    const weightKg = props.weightKg ?? null;
    const volumeM3 = props.volumeM3 ?? null;

    if (weightKg === null && volumeM3 === null) {
      throw new CapacityMustHaveWeightOrVolumeError();
    }
    if (weightKg !== null && weightKg <= 0) {
      throw new InvalidCapacityAmountError('weightKg', weightKg);
    }
    if (volumeM3 !== null && volumeM3 <= 0) {
      throw new InvalidCapacityAmountError('volumeM3', volumeM3);
    }

    return new Capacity({ weightKg, volumeM3 });
  }

  toPlain(): CapacityProps {
    return { weightKg: this.weightKg, volumeM3: this.volumeM3 };
  }
}
