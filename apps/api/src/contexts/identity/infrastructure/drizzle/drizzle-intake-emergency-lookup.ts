import { Db } from '../../../../shared/db';
import { IntakeEmergencyLookup } from '../../domain/ports/intake-emergency-lookup';
import { donationIntakesTable } from '../../../offers/infrastructure/drizzle/donation-intake-schema';
import { findEmergencyIdByEntity } from './drizzle-emergency-lookup.factory';

export class DrizzleIntakeEmergencyLookup implements IntakeEmergencyLookup {
  constructor(private readonly db: Db) {}

  findEmergencyId(intakeId: string): Promise<string | null> {
    return findEmergencyIdByEntity(
      this.db,
      donationIntakesTable,
      donationIntakesTable.id,
      donationIntakesTable.emergencyId,
      intakeId,
    );
  }
}
