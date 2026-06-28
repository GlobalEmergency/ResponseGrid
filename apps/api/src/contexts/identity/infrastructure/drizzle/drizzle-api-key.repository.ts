import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { apiKeysTable } from './schema';
import { ApiKeyRepository } from '../../domain/ports/api-key.repository';
import { ApiKey } from '../../domain/api-key';

type Row = typeof apiKeysTable.$inferSelect;

function rowToApiKey(row: Row): ApiKey {
  return ApiKey.fromSnapshot({
    id: row.id,
    prefix: row.prefix,
    hashedSecret: row.hashedSecret,
    serviceAccountId: row.serviceAccountId,
    createdByUserId: row.createdByUserId,
    expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
    lastUsedAt: row.lastUsedAt === null ? null : row.lastUsedAt.toISOString(),
    revokedAt: row.revokedAt === null ? null : row.revokedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
}

export class DrizzleApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly db: Db) {}

  async save(key: ApiKey): Promise<void> {
    await this.db
      .insert(apiKeysTable)
      .values({
        id: key.id,
        prefix: key.prefix,
        hashedSecret: key.hashedSecret,
        serviceAccountId: key.serviceAccountId,
        createdByUserId: key.createdByUserId,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
        revokedAt: key.revokedAt,
        createdAt: key.createdAt,
      })
      .onConflictDoUpdate({
        target: apiKeysTable.id,
        set: { lastUsedAt: key.lastUsedAt, revokedAt: key.revokedAt },
      });
  }

  async findByPrefix(prefix: string): Promise<ApiKey | null> {
    const rows = await this.db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.prefix, prefix))
      .limit(1);
    return rows.length > 0 ? rowToApiKey(rows[0]) : null;
  }

  async findById(id: string): Promise<ApiKey | null> {
    const rows = await this.db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, id))
      .limit(1);
    return rows.length > 0 ? rowToApiKey(rows[0]) : null;
  }

  async listByServiceAccount(serviceAccountId: string): Promise<ApiKey[]> {
    const rows = await this.db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.serviceAccountId, serviceAccountId));
    return rows.map(rowToApiKey);
  }
}
