import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  ResourceLatLng,
  ResourceLocationLookup,
} from '../../domain/ports/resource-location-lookup';
// Cross-context infra coupling: logistics reads the resources table to resolve
// a node's coordinates for proximity ranking (#107). Accepted and documented in
// the port interface, mirroring offers' DrizzleNeedLookup.
import { resourcesTable } from '../../../resources/infrastructure/drizzle/schema';

export class DrizzleResourceLocationLookup implements ResourceLocationLookup {
  constructor(private readonly db: Db) {}

  async findLatLng(resourceId: string): Promise<ResourceLatLng | null> {
    const rows = await this.db
      .select({
        latitude: resourcesTable.latitude,
        longitude: resourcesTable.longitude,
      })
      .from(resourcesTable)
      .where(eq(resourcesTable.id, resourceId))
      .limit(1);
    if (!rows[0]) return null;
    return { latitude: rows[0].latitude, longitude: rows[0].longitude };
  }
}
