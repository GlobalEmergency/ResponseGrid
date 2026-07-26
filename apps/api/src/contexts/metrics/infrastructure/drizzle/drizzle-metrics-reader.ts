import { count, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { MetricsReader } from '../../domain/ports/metrics-reader';
import { NeedStatus } from '../../../needs/domain/need-enums';
import { PublicStatus } from '../../../resources/domain/resource-enums';
// Cross-context infra coupling: metrics reads needs/resources tables only for
// counting. These are direct table references — not full repository instances.
import { needsTable } from '../../../needs/infrastructure/drizzle/schema';
import { resourcesTable } from '../../../resources/infrastructure/drizzle/schema';

export class DrizzleMetricsReader implements MetricsReader {
  constructor(private readonly db: Db) {}

  async countNeedsByEmergencyGroupedByStatus(
    emergencyId: string,
  ): Promise<Record<NeedStatus, number>> {
    const rows = await this.db
      .select({ status: needsTable.status, cnt: count() })
      .from(needsTable)
      .where(eq(needsTable.emergencyId, emergencyId))
      .groupBy(needsTable.status);

    const result: Record<NeedStatus, number> = {
      [NeedStatus.Pending]: 0,
      [NeedStatus.Validated]: 0,
      [NeedStatus.Rejected]: 0,
      [NeedStatus.Fulfilled]: 0,
    };
    for (const row of rows) {
      const status = row.status as NeedStatus;
      if (status in result) {
        result[status] = Number(row.cnt);
      }
    }
    return result;
  }

  async countResourcesByEmergencyGroupedByPublicStatus(
    emergencyId: string,
  ): Promise<Record<PublicStatus, number>> {
    const rows = await this.db
      .select({ publicStatus: resourcesTable.publicStatus, cnt: count() })
      .from(resourcesTable)
      .where(eq(resourcesTable.emergencyId, emergencyId))
      .groupBy(resourcesTable.publicStatus);

    const result: Record<PublicStatus, number> = {
      [PublicStatus.Hidden]: 0,
      [PublicStatus.Active]: 0,
      [PublicStatus.Saturated]: 0,
      [PublicStatus.Paused]: 0,
      [PublicStatus.Closed]: 0,
      [PublicStatus.Preparing]: 0,
      [PublicStatus.Assisted]: 0,
    };
    for (const row of rows) {
      const status = row.publicStatus as PublicStatus;
      if (status in result) {
        result[status] = Number(row.cnt);
      }
    }
    return result;
  }
}
