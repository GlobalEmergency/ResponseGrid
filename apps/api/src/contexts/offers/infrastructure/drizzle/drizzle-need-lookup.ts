import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { NeedLookup, NeedLocation } from '../../domain/ports/need-lookup';
// Cross-context infra coupling: offers reads the needs table for validation and suggestion.
// Accepted and documented in the port interface.
import {
  needsTable,
  needItemsTable,
} from '../../../needs/infrastructure/drizzle/schema';

export class DrizzleNeedLookup implements NeedLookup {
  constructor(private readonly db: Db) {}

  async findEmergencyId(needId: string): Promise<string | null> {
    const rows = await this.db
      .select({ emergencyId: needsTable.emergencyId })
      .from(needsTable)
      .where(eq(needsTable.id, needId))
      .limit(1);
    return rows[0]?.emergencyId ?? null;
  }

  async findCategory(needId: string): Promise<string | null> {
    // The "primary" category of a need is the category of its first item
    const rows = await this.db
      .select({ category: needItemsTable.category })
      .from(needItemsTable)
      .where(eq(needItemsTable.needId, needId))
      .limit(1);
    return rows[0]?.category ?? null;
  }

  async findLocation(needId: string): Promise<NeedLocation | null> {
    const rows = await this.db
      .select({
        latitude: needsTable.latitude,
        longitude: needsTable.longitude,
        emergencyId: needsTable.emergencyId,
      })
      .from(needsTable)
      .where(eq(needsTable.id, needId))
      .limit(1);
    if (!rows[0]) return null;
    return {
      latitude: rows[0].latitude,
      longitude: rows[0].longitude,
      emergencyId: rows[0].emergencyId,
    };
  }
}
