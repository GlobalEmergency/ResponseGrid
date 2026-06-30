import { eq } from 'drizzle-orm';
import { Db } from './db';
import { emergenciesTable } from '../contexts/emergencies/infrastructure/drizzle/schema';

/**
 * Shared Drizzle adapter — reads resource_dispute_threshold from emergencies.
 *
 * Used by the resources context to apply a per-emergency dispute threshold
 * instead of the global constant. Accepted cross-context infra coupling,
 * following the same pattern as DrizzleEmergencyStatusReader.
 */
export class DrizzleEmergencyDisputeThresholdReader {
  constructor(private readonly db: Db) {}

  async getThreshold(emergencyId: string): Promise<number | null> {
    const rows = await this.db
      .select({
        resourceDisputeThreshold: emergenciesTable.resourceDisputeThreshold,
      })
      .from(emergenciesTable)
      .where(eq(emergenciesTable.id, emergencyId));
    return rows[0]?.resourceDisputeThreshold ?? null;
  }
}
