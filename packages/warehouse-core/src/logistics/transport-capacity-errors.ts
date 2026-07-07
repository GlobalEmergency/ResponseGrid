export class CapacityMustHaveWeightOrVolumeError extends Error {
  constructor() {
    super('Transport capacity must declare at least weightKg or volumeM3');
    this.name = 'CapacityMustHaveWeightOrVolumeError';
  }
}

export class InvalidCapacityAmountError extends Error {
  constructor(field: string, value: number) {
    super(`Capacity ${field} must be greater than 0, got ${value}`);
    this.name = 'InvalidCapacityAmountError';
  }
}

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
