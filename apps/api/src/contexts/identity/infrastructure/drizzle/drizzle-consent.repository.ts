import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { userConsentsTable } from './schema';
import {
  ConsentContext,
  ConsentEntry,
  ConsentRepository,
} from '../../domain/ports/consent.repository';
import { ConsentDocument, ConsentSnapshot } from '../../domain/consent';
import { UserId } from '../../domain/user-id';

type Row = typeof userConsentsTable.$inferSelect;

function rowToSnapshot(row: Row): ConsentSnapshot {
  return {
    document: row.document as ConsentDocument,
    version: row.version,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    acceptedAt: row.acceptedAt,
  };
}

export class DrizzleConsentRepository implements ConsentRepository {
  constructor(private readonly db: Db) {}

  async record(
    userId: UserId,
    entries: ConsentEntry[],
    context: ConsentContext,
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.db.insert(userConsentsTable).values(
      entries.map((e) => ({
        id: randomUUID(),
        userId: userId.value,
        document: e.document,
        version: e.version,
        ip: context.ip,
        userAgent: context.userAgent,
        serviceAccountId: context.serviceAccountId ?? null,
      })),
    );
  }

  async findByUser(userId: UserId): Promise<ConsentSnapshot[]> {
    const rows = await this.db
      .select()
      .from(userConsentsTable)
      .where(eq(userConsentsTable.userId, userId.value));
    return rows.map(rowToSnapshot);
  }
}
