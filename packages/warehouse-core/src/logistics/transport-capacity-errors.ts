// Estos dos errores se movieron al `kernel` junto con el VO `Capacity`. Se
// re-exportan desde aquí para no romper a sus consumidores (misma clase, así que
// `instanceof` sigue funcionando).
export {
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
} from '../kernel/capacity.js';

export class InvalidCoverageError extends Error {
  /**
   * Stable identifier for web localization (#348), set only for the subset of
   * validation failures the web has copy for (currently just the empty-area
   * case) — `undefined` for the rest, which still degrade gracefully to the
   * caller's generic fallback message.
   */
  constructor(
    message: string,
    public readonly code?: 'coverage_area_required',
  ) {
    super(message);
    this.name = 'InvalidCoverageError';
  }
}

export class InvalidCapacityWindowError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'capacity_window_invalid_date'
      | 'capacity_window_order_invalid',
  ) {
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
