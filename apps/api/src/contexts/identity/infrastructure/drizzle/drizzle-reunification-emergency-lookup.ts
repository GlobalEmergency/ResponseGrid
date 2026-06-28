import { Db } from '../../../../shared/db';
import { ReunificationEmergencyLookup } from '../../domain/ports/reunification-emergency-lookup';
// Cross-context infra coupling: identity reads the missing_person_reports table
// only for authorization, mirroring the other *EmergencyLookup adapters.
import { missingPersonReportsTable } from '../../../reunification/infrastructure/drizzle/schema';
import { findEmergencyIdByEntity } from './drizzle-emergency-lookup.factory';

export class DrizzleReunificationEmergencyLookup implements ReunificationEmergencyLookup {
  constructor(private readonly db: Db) {}

  findEmergencyId(reportId: string): Promise<string | null> {
    return findEmergencyIdByEntity(
      this.db,
      missingPersonReportsTable,
      missingPersonReportsTable.id,
      missingPersonReportsTable.emergencyId,
      reportId,
    );
  }
}
