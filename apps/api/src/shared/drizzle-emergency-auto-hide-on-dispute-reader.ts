import { eq } from 'drizzle-orm';
import { Db } from './db';
import { emergenciesTable } from '../contexts/emergencies/infrastructure/drizzle/schema';

/**
 * Shared Drizzle adapter — reads auto_hide_on_dispute from emergencies.
 *
 * Used by the resources context's `ResourceDisputed` handler (#171) to decide
 * whether to auto-resolve a dispute on threshold. Accepted cross-context infra
 * coupling, following the same pattern as DrizzleEmergencyDisputeThresholdReader.
 */
export class DrizzleEmergencyAutoHideOnDisputeReader {
  constructor(private readonly db: Db) {}

  async getAutoHideOnDispute(emergencyId: string): Promise<boolean> {
    const rows = await this.db
      .select({
        autoHideOnDispute: emergenciesTable.autoHideOnDispute,
      })
      .from(emergenciesTable)
      .where(eq(emergenciesTable.id, emergencyId));
    return rows[0]?.autoHideOnDispute ?? false;
  }
}
