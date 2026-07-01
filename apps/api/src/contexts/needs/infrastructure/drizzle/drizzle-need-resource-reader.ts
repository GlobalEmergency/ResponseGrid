import { and, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { NeedResourceReader } from '../../domain/ports/resource-reader';
import { resourcesTable } from '../../../resources/infrastructure/drizzle/schema';

/**
 * Drizzle adapter — checks a resource exists in a given emergency, for the
 * needs `resourceId` link (#60). Reads the `resources` table directly:
 * accepted cross-context infra coupling (same pattern as the shared emergency
 * status reader).
 */
export class DrizzleNeedResourceReader implements NeedResourceReader {
  constructor(private readonly db: Db) {}

  async existsInEmergency(
    resourceId: string,
    emergencyId: string,
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: resourcesTable.id })
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.id, resourceId),
          eq(resourcesTable.emergencyId, emergencyId),
        ),
      );
    return rows.length > 0;
  }
}
