/**
 * Capacidad expresada como peso y/o volumen. Invariante: al menos una de las dos
 * dimensiones debe estar presente y ser positiva (un contenedor/vehículo que no
 * puede llevar ninguna no es una capacidad). Cualquiera de las dos puede omitirse
 * cuando sólo se conoce una de ellas.
 *
 * Vive en el `kernel` (no en `logistics`) porque tanto `inventory` (la carga útil
 * máxima de un vehículo) como `logistics` (una oferta de transporte) la comparten,
 * y el kernel no puede depender de ningún módulo. `logistics/capacity.ts` la
 * re-exporta para no romper a sus consumidores.
 */

export interface CapacityProps {
  weightKg: number | null;
  volumeM3: number | null;
}

/** Se lanza cuando una capacidad no declara ni peso ni volumen. */
export class CapacityMustHaveWeightOrVolumeError extends Error {
  constructor() {
    super('Transport capacity must declare at least weightKg or volumeM3');
    this.name = 'CapacityMustHaveWeightOrVolumeError';
  }
}

/** Se lanza cuando una dimensión de capacidad presente no es positiva. */
export class InvalidCapacityAmountError extends Error {
  constructor(field: string, value: number) {
    super(`Capacity ${field} must be greater than 0, got ${value}`);
    this.name = 'InvalidCapacityAmountError';
  }
}

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
