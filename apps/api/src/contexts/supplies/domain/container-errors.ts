/**
 * Raised on invalid container input (empty code, non-positive weight/volume,
 * out-of-range line index, empty holder id). The HTTP layer maps it to 422.
 */
export class ContainerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainerValidationError';
  }
}

/**
 * Raised when mutating the lines of a sealed (precintado) container, or sealing
 * one that is already sealed. A sealed container's content is immutable; the
 * HTTP layer maps this to 409 Conflict.
 */
export class ContainerSealedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainerSealedError';
  }
}

/**
 * Raised when nesting would create a cycle — a container cannot be its own
 * ancestor (nor its own parent). Keeps the composition tree acyclic.
 */
export class ContainerCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainerCycleError';
  }
}

/**
 * Raised when nesting a container under a parent that belongs to a different
 * emergency. A container and its parent must share the same `emergencyId`.
 */
export class ContainerEmergencyMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainerEmergencyMismatchError';
  }
}
