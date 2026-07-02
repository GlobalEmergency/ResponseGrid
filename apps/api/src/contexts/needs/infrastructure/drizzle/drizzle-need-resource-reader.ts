import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { resourcesTable } from '../../../resources/infrastructure/drizzle/schema';
import { NeedResourceReader } from '../../domain/ports/resource-reader';

/**
 * Drizzle adapter — resolves a resource's emergency so CreateNeed can validate
 * the optional `resourceId` link (#60).
 *
 * Infrastructure coupling: reads the `resources` table directly — accepted
 * cross-context infra coupling, documented here (same pattern as
 * DrizzleEmergencyStatusReader).
 */
export class DrizzleNeedResourceReader implements NeedResourceReader {
  constructor(private readonly db: Db) {}

  async getEmergencyId(resourceId: string): Promise<string | null> {
    const rows = await this.db
      .select({ emergencyId: resourcesTable.emergencyId })
      .from(resourcesTable)
      .where(eq(resourcesTable.id, resourceId));
    return rows[0]?.emergencyId ?? null;
  }
}
