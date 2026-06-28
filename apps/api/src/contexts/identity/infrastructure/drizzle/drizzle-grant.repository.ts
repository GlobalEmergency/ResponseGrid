import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { grantsTable } from './schema';
import { GrantRepository } from '../../domain/ports/grant.repository';
import { Grant, PrincipalType } from '../../domain/authorization/grant';
import { ScopeRefProps } from '../../domain/authorization/scope-ref';

type Row = typeof grantsTable.$inferSelect;

interface ScopeColumns {
  scopeType: string;
  scopeId: string | null;
  scopeEntityType: string | null;
}

function scopeToColumns(scope: ScopeRefProps): ScopeColumns {
  switch (scope.type) {
    case 'platform':
      return { scopeType: 'platform', scopeId: null, scopeEntityType: null };
    case 'entity':
      return {
        scopeType: 'entity',
        scopeId: scope.id,
        scopeEntityType: scope.entityType,
      };
    default:
      return {
        scopeType: scope.type,
        scopeId: scope.id,
        scopeEntityType: null,
      };
  }
}

function rowToScope(row: Row): ScopeRefProps {
  switch (row.scopeType) {
    case 'platform':
      return { type: 'platform' };
    case 'organization':
    case 'emergency':
    case 'group':
      if (row.scopeId === null) {
        throw new Error(
          `grant ${row.id}: scope_id is required for scope ${row.scopeType}`,
        );
      }
      return { type: row.scopeType, id: row.scopeId };
    case 'entity':
      if (row.scopeId === null || row.scopeEntityType === null) {
        throw new Error(
          `grant ${row.id}: entity scope requires scope_id and scope_entity_type`,
        );
      }
      return {
        type: 'entity',
        id: row.scopeId,
        entityType: row.scopeEntityType,
      };
    default:
      throw new Error(`grant ${row.id}: unknown scope_type "${row.scopeType}"`);
  }
}

function rowToGrant(row: Row): Grant {
  return Grant.fromSnapshot({
    id: row.id,
    principalId: row.principalId,
    principalType: row.principalType as PrincipalType,
    roleId: row.roleId,
    scope: rowToScope(row),
    grantedByPrincipalId: row.grantedByPrincipalId,
    grantedAt: row.grantedAt.toISOString(),
    expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
  });
}

export class DrizzleGrantRepository implements GrantRepository {
  constructor(private readonly db: Db) {}

  async save(grant: Grant): Promise<void> {
    const cols = scopeToColumns(grant.scope.toPlain());
    await this.db
      .insert(grantsTable)
      .values({
        id: grant.id,
        principalId: grant.principalId,
        principalType: grant.principalType,
        roleId: grant.roleId,
        scopeType: cols.scopeType,
        scopeId: cols.scopeId,
        scopeEntityType: cols.scopeEntityType,
        grantedByPrincipalId: grant.grantedByPrincipalId,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
      })
      .onConflictDoNothing({ target: grantsTable.id });
  }

  async findByPrincipal(principalId: string): Promise<Grant[]> {
    const rows = await this.db
      .select()
      .from(grantsTable)
      .where(eq(grantsTable.principalId, principalId));
    return rows.map(rowToGrant);
  }

  async findById(id: string): Promise<Grant | null> {
    const rows = await this.db
      .select()
      .from(grantsTable)
      .where(eq(grantsTable.id, id))
      .limit(1);
    return rows.length > 0 ? rowToGrant(rows[0]) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(grantsTable).where(eq(grantsTable.id, id));
  }
}
