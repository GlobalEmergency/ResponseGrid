/**
 * Raised on invalid warehouse/zone input (empty code or name, out-of-range
 * coordinates, unknown zone id). The HTTP layer of each host maps it to 422.
 */
export class WarehouseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WarehouseValidationError';
  }
}

/**
 * Raised when two zones in the same warehouse would share a code, or when
 * adding a zone whose code already exists. Zone codes are the human-facing
 * labels of the layout and must be unique within their warehouse. The HTTP
 * layer maps this to 409 Conflict.
 */
export class DuplicateZoneCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateZoneCodeError';
  }
}

/**
 * Raised when mutating an archived warehouse or zone (adding a zone to an
 * archived warehouse, renaming an archived zone…). Archived layout is
 * read-only history; the HTTP layer maps this to 409 Conflict.
 */
export class WarehouseArchivedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WarehouseArchivedError';
  }
}

/**
 * Raised on invalid bin input (empty/oversized code, empty warehouse id). The
 * HTTP layer of each host maps it to 422.
 */
export class BinValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BinValidationError';
  }
}

/**
 * Raised when mutating an archived bin (blocking, reassigning its zone…). An
 * archived bin is retired, read-only history; the HTTP layer maps this to 409
 * Conflict.
 */
export class BinArchivedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BinArchivedError';
  }
}
