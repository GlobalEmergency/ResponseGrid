import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { OfferEmergencyLookup } from '../../domain/ports/offer-emergency-lookup';
// Cross-context infra coupling: identity reads the offers table only for authorization.
// The dependency is intentional and documented in the port interface.
import { offersTable } from '../../../offers/infrastructure/drizzle/schema';

export class DrizzleOfferEmergencyLookup implements OfferEmergencyLookup {
  constructor(private readonly db: Db) {}

  async findEmergencyId(offerId: string): Promise<string | null> {
    const rows = await this.db
      .select({ emergencyId: offersTable.emergencyId })
      .from(offersTable)
      .where(eq(offersTable.id, offerId))
      .limit(1);
    return rows[0]?.emergencyId ?? null;
  }
}
