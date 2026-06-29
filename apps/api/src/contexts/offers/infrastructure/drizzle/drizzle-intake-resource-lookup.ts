import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { resourcesTable } from '../../../resources/infrastructure/drizzle/schema';
import { emergenciesTable } from '../../../emergencies/infrastructure/drizzle/schema';
import {
  IntakeResourceInfo,
  IntakeResourceLookup,
} from '../../domain/ports/intake-resource-lookup';

export class DrizzleIntakeResourceLookup implements IntakeResourceLookup {
  constructor(private readonly db: Db) {}

  async findForIntake(resourceId: string): Promise<IntakeResourceInfo | null> {
    const rows = await this.db
      .select({
        id: resourcesTable.id,
        emergencyId: resourcesTable.emergencyId,
        emergencySlug: emergenciesTable.slug,
        name: resourcesTable.name,
        type: resourcesTable.type,
        publicStatus: resourcesTable.publicStatus,
      })
      .from(resourcesTable)
      .innerJoin(
        emergenciesTable,
        eq(resourcesTable.emergencyId, emergenciesTable.id),
      )
      .where(eq(resourcesTable.id, resourceId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      emergencyId: row.emergencyId,
      emergencySlug: row.emergencySlug,
      name: row.name,
      type: row.type,
      publicStatus: row.publicStatus,
    };
  }
}
