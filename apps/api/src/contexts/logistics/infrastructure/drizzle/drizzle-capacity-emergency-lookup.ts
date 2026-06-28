import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { CapacityEmergencyLookup } from '../../domain/ports/capacity-emergency-lookup';
import { transportCapacitiesTable } from './schema';

/**
 * Drizzle adapter resolving a capacity's owning emergency for the withdraw
 * authorization check. Reads only the logistics table, so there is no
 * cross-context coupling.
 */
export class DrizzleCapacityEmergencyLookup implements CapacityEmergencyLookup {
  constructor(private readonly db: Db) {}

  async findEmergencyId(capacityId: string): Promise<string | null> {
    const rows = await this.db
      .select({ emergencyId: transportCapacitiesTable.emergencyId })
      .from(transportCapacitiesTable)
      .where(eq(transportCapacitiesTable.id, capacityId))
      .limit(1);
    return rows[0]?.emergencyId ?? null;
  }
}
