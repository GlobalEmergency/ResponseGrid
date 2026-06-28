import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  ShipmentAuthorizationFacts,
  ShipmentAuthorizationLookup,
} from '../../domain/ports/shipment-authorization-lookup';
import { shipmentsTable } from './schema';

/**
 * Drizzle adapter resolving a shipment's owning emergency and carrier for the
 * in-transit/deliver authorization check. Reads only the logistics table, so
 * there is no cross-context coupling (mirrors DrizzleCapacityEmergencyLookup).
 */
export class DrizzleShipmentAuthorizationLookup implements ShipmentAuthorizationLookup {
  constructor(private readonly db: Db) {}

  async findAuthorizationFacts(
    shipmentId: string,
  ): Promise<ShipmentAuthorizationFacts | null> {
    const rows = await this.db
      .select({
        emergencyId: shipmentsTable.emergencyId,
        carrierId: shipmentsTable.carrierId,
      })
      .from(shipmentsTable)
      .where(eq(shipmentsTable.id, shipmentId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { emergencyId: row.emergencyId, carrierId: row.carrierId ?? null };
  }
}
