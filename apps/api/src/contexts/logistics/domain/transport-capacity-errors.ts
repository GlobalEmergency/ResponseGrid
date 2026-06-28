import { CapacityStatus } from './transport-capacity-enums';

export class InvalidTransportCapacityError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidTransportCapacityError';
  }
}

export class CapacityNotAvailableError extends Error {
  constructor() {
    super('Transport capacity is not available');
    this.name = 'CapacityNotAvailableError';
  }
}

export class CapacityNotReservedError extends Error {
  constructor() {
    super('Transport capacity is not reserved');
    this.name = 'CapacityNotReservedError';
  }
}

export class CapacityCannotBeWithdrawnError extends Error {
  constructor(status: CapacityStatus) {
    super(`Transport capacity in status '${status}' cannot be withdrawn`);
    this.name = 'CapacityCannotBeWithdrawnError';
  }
}
