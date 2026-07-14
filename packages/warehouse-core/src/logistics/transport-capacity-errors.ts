// Estos dos errores se movieron al `kernel` junto con el VO `Capacity`. Se
// re-exportan desde aquí para no romper a sus consumidores (misma clase, así que
// `instanceof` sigue funcionando).
export {
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
} from '../kernel/capacity.js';

export class InvalidCoverageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCoverageError';
  }
}

export class InvalidCapacityWindowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCapacityWindowError';
  }
}

export class CapacityNotAvailableError extends Error {
  constructor() {
    super('Transport capacity must be in available status to be withdrawn');
    this.name = 'CapacityNotAvailableError';
  }
}

export class CapacityAlreadyWithdrawnError extends Error {
  constructor() {
    super('Transport capacity is already withdrawn');
    this.name = 'CapacityAlreadyWithdrawnError';
  }
}
