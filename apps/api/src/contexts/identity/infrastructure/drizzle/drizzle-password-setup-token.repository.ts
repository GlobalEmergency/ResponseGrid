import { and, eq, isNull } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { passwordSetupTokensTable } from './schema';
import { PasswordSetupTokenRepository } from '../../domain/ports/password-setup-token.repository';
import {
  PasswordSetupToken,
  PasswordSetupTokenSnapshot,
} from '../../domain/password-setup-token';

type Row = typeof passwordSetupTokensTable.$inferSelect;

function rowToSnapshot(row: Row): PasswordSetupTokenSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt.toISOString(),
    usedAt: row.usedAt === null ? null : row.usedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export class DrizzlePasswordSetupTokenRepository implements PasswordSetupTokenRepository {
  constructor(private readonly db: Db) {}

  async save(token: PasswordSetupToken): Promise<void> {
    const s = token.toSnapshot();
    await this.db.insert(passwordSetupTokensTable).values({
      id: s.id,
      userId: s.userId,
      tokenHash: s.tokenHash,
      expiresAt: new Date(s.expiresAt),
      usedAt: s.usedAt === null ? null : new Date(s.usedAt),
      createdAt: new Date(s.createdAt),
    });
  }

  async findByHash(tokenHash: string): Promise<PasswordSetupToken | null> {
    const rows = await this.db
      .select()
      .from(passwordSetupTokensTable)
      .where(eq(passwordSetupTokensTable.tokenHash, tokenHash))
      .limit(1);
    return rows[0]
      ? PasswordSetupToken.fromSnapshot(rowToSnapshot(rows[0]))
      : null;
  }

  async markUsedForUser(userId: string, at: Date): Promise<void> {
    await this.db
      .update(passwordSetupTokensTable)
      .set({ usedAt: at })
      .where(
        and(
          eq(passwordSetupTokensTable.userId, userId),
          isNull(passwordSetupTokensTable.usedAt),
        ),
      );
  }
}
