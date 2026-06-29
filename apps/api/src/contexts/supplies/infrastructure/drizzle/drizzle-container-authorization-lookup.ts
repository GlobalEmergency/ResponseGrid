import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { containersTable } from './schema';
import {
  ContainerAuthorizationFacts,
  ContainerAuthorizationLookup,
} from '../../domain/ports/container-authorization-lookup';

export class DrizzleContainerAuthorizationLookup implements ContainerAuthorizationLookup {
  constructor(private readonly db: Db) {}

  async findAuthorizationFacts(
    containerId: string,
  ): Promise<ContainerAuthorizationFacts | null> {
    const rows = await this.db
      .select({ emergencyId: containersTable.emergencyId })
      .from(containersTable)
      .where(eq(containersTable.id, containerId))
      .limit(1);
    if (!rows[0]) return null;
    return { emergencyId: rows[0].emergencyId };
  }
}
