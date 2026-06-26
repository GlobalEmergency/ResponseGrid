import { eq } from 'drizzle-orm';
import { Db } from './db';
import { emergenciesTable } from '../contexts/emergencies/infrastructure/drizzle/schema';

/**
 * Shared Drizzle adapter — reads the status column from the emergencies table.
 *
 * Used by both resources and needs contexts to enforce the intake kill-switch
 * rule without duplicating the query. Registered in each consuming module as
 * the concrete implementation of their respective domain port.
 *
 * Infrastructure coupling: reads `emergencies` table directly — accepted
 * cross-context infra coupling, documented here.
 */
export class DrizzleEmergencyStatusReader {
  constructor(private readonly db: Db) {}

  async getStatus(emergencyId: string): Promise<string | null> {
    const rows = await this.db
      .select({ status: emergenciesTable.status })
      .from(emergenciesTable)
      .where(eq(emergenciesTable.id, emergencyId));
    return rows[0]?.status ?? null;
  }
}
