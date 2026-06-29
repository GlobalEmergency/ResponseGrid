import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { ScopeNameReader } from '../../domain/ports/scope-name-reader';
// Cross-context infra coupling: resolves a grant's scope id to a display name by
// reading the owning tables (names only). Identity reads them directly rather
// than importing each context's module (cycles). DIP-clean via the port.
import { organizationsTable } from '../../../organizations/infrastructure/drizzle/schema';
import { emergenciesTable } from '../../../emergencies/infrastructure/drizzle/schema';
import { groupsTable } from '../../../groups/infrastructure/drizzle/schema';

export class DrizzleScopeNameReader implements ScopeNameReader {
  constructor(private readonly db: Db) {}

  async nameFor(scopeType: string, scopeId: string): Promise<string | null> {
    switch (scopeType) {
      case 'organization': {
        const rows = await this.db
          .select({ name: organizationsTable.name })
          .from(organizationsTable)
          .where(eq(organizationsTable.id, scopeId))
          .limit(1);
        return rows[0]?.name ?? null;
      }
      case 'emergency': {
        const rows = await this.db
          .select({ name: emergenciesTable.name })
          .from(emergenciesTable)
          .where(eq(emergenciesTable.id, scopeId))
          .limit(1);
        return rows[0]?.name ?? null;
      }
      case 'group': {
        const rows = await this.db
          .select({ name: groupsTable.name })
          .from(groupsTable)
          .where(eq(groupsTable.id, scopeId))
          .limit(1);
        return rows[0]?.name ?? null;
      }
      default:
        // platform (no id) / entity / hub / corridor → no display name
        return null;
    }
  }
}
