export class InvalidDisputeThresholdError extends Error {
  constructor(value: number) {
    super(
      `Invalid resource dispute threshold '${value}': must be an integer between 1 and ${MAX_RESOURCE_DISPUTE_THRESHOLD}, or null to use the global default`,
    );
    this.name = 'InvalidDisputeThresholdError';
  }
}

/**
 * Upper bound for a per-emergency dispute threshold. Keeps the value sane and,
 * crucially, below Postgres `integer` range so a valid-looking but huge number
 * can never overflow the column at persistence time.
 */
export const MAX_RESOURCE_DISPUTE_THRESHOLD = 1000;
